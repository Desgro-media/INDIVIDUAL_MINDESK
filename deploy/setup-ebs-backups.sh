#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Sets up daily automated EBS snapshots for the EC2 instance running Postgres
# (individual-db) via AWS Data Lifecycle Manager (DLM) — a native AWS service,
# no cron job or extra process running on the instance itself.
#
# Why this matters: docker-compose.prod.yml stores Postgres data in a Docker
# named volume (individual_pgdata), which physically lives on the instance's
# ROOT EBS volume — there is no separate data volume. So "back up the
# database" here means "snapshot the whole root volume," which is exactly
# what an instance-targeted DLM policy does: it finds every volume attached
# to a tagged instance and snapshots all of them together, daily.
#
# Run this from YOUR OWN machine (or CloudShell) with AWS CLI configured
# against the account the instance lives in — NOT from inside the EC2
# instance. This is an account-level control-plane action, not something the
# app server needs credentials for.
#
# Usage:
#   ./setup-ebs-backups.sh <instance-id> [region] [retain-count] [snapshot-time-utc]
# Example:
#   ./setup-ebs-backups.sh i-0123456789abcdef0 us-east-1 7 02:00
#
# Idempotent: safe to re-run — reuses the IAM role and updates the policy
# schedule/retention if you change the arguments and run it again.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

INSTANCE_ID="${1:?Usage: $0 <instance-id> [region] [retain-count] [snapshot-time-utc]}"
REGION="${2:-us-east-1}"
RETAIN_COUNT="${3:-7}"
SNAPSHOT_TIME="${4:-02:00}"
TAG_KEY="mindesk:backup"
TAG_VALUE="daily"
ROLE_NAME="AWSDataLifecycleManagerDefaultRole"

command -v aws >/dev/null 2>&1 || { echo "AWS CLI not found — install it first: https://aws.amazon.com/cli/"; exit 1; }
aws sts get-caller-identity --region "$REGION" >/dev/null || { echo "AWS CLI isn't authenticated — run 'aws configure' first."; exit 1; }

echo "== Verifying instance $INSTANCE_ID exists in $REGION =="
aws ec2 describe-instances --region "$REGION" --instance-ids "$INSTANCE_ID" >/dev/null

echo "== Tagging instance so the backup policy can find it =="
aws ec2 create-tags --region "$REGION" \
  --resources "$INSTANCE_ID" \
  --tags "Key=${TAG_KEY},Value=${TAG_VALUE}"

echo "== Ensuring the DLM service role exists =="
if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  TRUST_POLICY=$(cat <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "dlm.amazonaws.com" },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON
)
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" \
    --description "Lets AWS Data Lifecycle Manager snapshot Mindesk's EC2 volumes" >/dev/null
  aws iam attach-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSDataLifecycleManagerServiceRole" >/dev/null
  echo "Created IAM role $ROLE_NAME (first-time setup — takes a few seconds to propagate)"
  sleep 10
else
  echo "IAM role $ROLE_NAME already exists — reusing it"
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${ROLE_NAME}"

echo "== Creating/updating the daily snapshot policy =="
POLICY_DETAILS=$(cat <<JSON
{
  "ResourceTypes": ["INSTANCE"],
  "TargetTags": [{ "Key": "${TAG_KEY}", "Value": "${TAG_VALUE}" }],
  "Schedules": [
    {
      "Name": "DailyMindeskBackup",
      "CreateRule": {
        "Interval": 24,
        "IntervalUnit": "HOURS",
        "Times": ["${SNAPSHOT_TIME}"]
      },
      "RetainRule": { "Count": ${RETAIN_COUNT} },
      "CopyTags": true,
      "TagsToAdd": [{ "Key": "mindesk:automated-backup", "Value": "true" }]
    }
  ]
}
JSON
)

EXISTING_POLICY_ID=$(aws dlm get-lifecycle-policies --region "$REGION" \
  --tags "${TAG_KEY}=${TAG_VALUE}" \
  --query "Policies[?Description=='Mindesk daily EC2 volume backup'].PolicyId | [0]" \
  --output text 2>/dev/null || true)

if [ -n "$EXISTING_POLICY_ID" ] && [ "$EXISTING_POLICY_ID" != "None" ]; then
  echo "Updating existing policy $EXISTING_POLICY_ID"
  aws dlm update-lifecycle-policy --region "$REGION" \
    --policy-id "$EXISTING_POLICY_ID" \
    --policy-details "$POLICY_DETAILS" \
    --state ENABLED >/dev/null
  POLICY_ID="$EXISTING_POLICY_ID"
else
  POLICY_ID=$(aws dlm create-lifecycle-policy --region "$REGION" \
    --description "Mindesk daily EC2 volume backup" \
    --state ENABLED \
    --execution-role-arn "$ROLE_ARN" \
    --policy-details "$POLICY_DETAILS" \
    --query PolicyId --output text)
  echo "Created policy $POLICY_ID"
fi

echo
echo "== Done =="
echo "Every volume attached to $INSTANCE_ID will be snapshotted daily at ${SNAPSHOT_TIME} UTC,"
echo "keeping the last ${RETAIN_COUNT} snapshots. Verify any time with:"
echo "  aws dlm get-lifecycle-policy --region $REGION --policy-id $POLICY_ID"
echo "  aws ec2 describe-snapshots --region $REGION --filters Name=tag:mindesk:automated-backup,Values=true"
echo
echo "First snapshot won't appear until the next scheduled run — DLM does not snapshot immediately on policy creation."
