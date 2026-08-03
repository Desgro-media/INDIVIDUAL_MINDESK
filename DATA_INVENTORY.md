# Data Inventory

Internal reference for what Mindesk actually collects, stores, and sends to third parties — built by
reading the codebase (entities, controllers, integrations), not from a generic template. Use this to
brief a lawyer, fill in a DPIA/RoPA if one is required, and to sanity-check the public
[Terms of Use](frontend/app/terms/page.tsx) and [Privacy Policy](frontend/app/privacy/page.tsx), which
are written in plain language for end users and should stay consistent with this document.

**Not legal advice.** This is a factual inventory, not a compliance certification.

---

## 1. Data subjects

| Subject | Who they are | Has a Mindesk login? |
|---|---|---|
| Practitioner (tenant root) | Individual freelancer, or a Clinic's owner/admin | Yes |
| Clinic staff | Doctors, receptionists, support staff added by a clinic owner | Yes |
| Patient / Client | The practitioner's own patients, booked via the public link | No — no account, no password |
| Superadmin | The single platform-operator account | Yes, seeded at deploy |

## 2. What's collected, by entity

Source of truth: `backend/src/main/java/com/patientbook/entity/`.

| Entity | Fields with personal/sensitive data | Subject | Notes |
|---|---|---|---|
| `AppUser` | name, username (email), phone, password (BCrypt hash), jobTitle, bio, profileImageUrl | Practitioner / staff | Password never stored/retrievable in plaintext. `phone` is required on new signups but nullable on rows created before it existed — the dashboard prompts those tenants to fill it in post-login (`AuthController.updatePhone`) |
| `Patient` | name, email, phone, riskFlag, riskReason, additionalNotes, telegramChatId, source | Patient | Deduplicated per-practitioner by phone |
| `PatientAttachment` | fileName, fileType, fileData (base64, in-DB) | Patient | No object storage (S3 etc.) — files live in Postgres |
| `SessionNote` | SOAP fields (Subjective/Objective/Assessment/Plan) + legacy free-text | Patient | Clinical content |
| `MoodLog` | 1–10 self-reported score | Patient | Submitted via tokenized public link, no login |
| `Appointment` | date/time, service, status, trackingToken | Patient | Links tenant (`psychologistId`) and treating doctor (`assignedDoctorId`) |
| `Invoice` | amount, discount, paymentMethod, bank account paid to | Patient (billing) | |
| `BankAccount` | accountName, bankName, accountNumber, ifscCode, upiId, qrCodeBase64 | Practitioner | The practitioner's own payout details, not the patient's |
| `ClinicSettings` | practice name, address, contact, payment QR | Practitioner | |
| `StaffAttendance` | login/logout timestamps | Staff | |
| `PaymentSubmission` | upiTransactionRef (UTR), screenshotBase64, amountClaimed | Practitioner | Proof of the practitioner's own platform subscription payment (₹4,999/year Individual, ₹9,999/year Clinic — see `AuthController.startTrial`) — not a patient payment, and not a card transaction (no payment gateway is integrated) |
| `NotificationLog` | type, status, errorMessage (no message body) | — | Records that a notification was attempted, not its content |
| `AdminAuditLog` | superadmin action records | Superadmin | Accountability trail |

## 3. Data NOT collected (worth stating explicitly, since it's easy to assume otherwise)

- No payment card numbers, CVV, or card-network data — there is no payment gateway integration; the
  platform subscription is paid by manual UPI transfer outside the app.
- No government ID numbers (Aadhaar, SSN, passport, etc.) are captured anywhere in the schema.
- No location/GPS tracking.
- No third-party analytics, advertising, or tracking cookies — confirmed by searching the frontend for
  `gtag`/`google-analytics`/`mixpanel`/`sentry`/`hotjar`/`posthog`; none are present.
- No biometric data.

## 4. Third-party data flows

All optional except hosting; the app runs with any of these unconfigured.

| Provider | What's sent | Trigger |
|---|---|---|
| Resend | recipient email, notification content | Email notifications, if `RESEND_API_KEY` set |
| Twilio | recipient phone number, message content | SMS/WhatsApp notifications, if `TWILIO_*` set |
| Telegram Bot API | linked chat ID, message content | Notifications to a patient who linked Telegram |
| AI chat provider (OpenAI-compatible, `AI_BASE_URL`) | raw text typed into the chat widget | The chatbot is mounted in the root layout (`frontend/app/layout.tsx`) — it renders on **every** page including the dashboard, not just public marketing pages. It is not fed patient records or account identity, but a logged-in practitioner *could* type patient-identifying info into it, which would leave the platform. Consider either scoping the widget out of `/dashboard/**` routes or adding an explicit "don't enter patient info here" notice in the widget UI itself. |
| Google Calendar | — | Scaffolded only (env vars + a DB column exist); no OAuth flow or callback is implemented, so **no data actually flows here today** |
| Hosting (EC2/Docker + Postgres, Vercel for frontend) | everything | Infrastructure-level processor |

## 5. Storage & retention

- Single PostgreSQL database, tenant-isolated at the application/query layer (no per-tenant DB or
  schema separation).
- Files (patient attachments, payment screenshots, QR codes) are stored as base64 **inside** Postgres
  rows, not in separate object storage.
- No automated retention/deletion job exists today — data persists until manually removed. Deactivating
  a staff account is a soft-delete (`enabled=false`); historical records keep their real name attached.
  **Before launch, decide and document an actual retention period** (the Privacy Policy currently has a
  placeholder for this) and, ideally, build the deletion job to match it.
- No password-reset self-service flow exists (see README's "Known limitations") — support currently
  has to reset a forgotten password manually, which the Terms of Use now discloses.

## 6. Access control notes relevant to a privacy review

- JWT-based auth, ~8h expiry; deactivation takes effect on the very next request (not cached).
- Tenant-scoped queries are ownership-checked; a wrong ID and a different tenant's ID both 404
  identically (no existence leakage).
- Superadmin can be IP-allowlisted (`SUPERADMIN_IP_ALLOWLIST`) — optional, blank by default.
- Rate limiting on login/signup/booking/phone-lookup endpoints is in-memory/single-instance — fine for
  one backend replica, would need a shared store if scaled horizontally.

## 7. Open items before launch

- [ ] Fill in the legal-entity name, registered address, governing-law jurisdiction, and support/
      grievance-officer contact in `frontend/app/terms/page.tsx` and `frontend/app/privacy/page.tsx`
      (search both files for `legal-placeholder`).
- [ ] Decide a real refund policy (Terms §5) and retention period (Privacy §6).
- [ ] Have a lawyer confirm whether, given the mental-health data involved, you need anything beyond
      this policy — e.g. a formal Data Processing Agreement with practitioner customers, specific
      consent language they should show their own patients, or registration/notification obligations
      under India's DPDP Act 2023 depending on your data-fiduciary classification.
- [ ] Decide what to do about the AI chat widget being mounted dashboard-wide (see §4) — scope it to
      public pages only, or add an inline warning not to paste patient info into it.
- [ ] Get the three landing-page testimonials (`frontend/components/Testimonials.tsx`) actually
      confirmed by each practitioner before publishing — the code comment there notes the quotes are
      drafted on their behalf and not yet signed off, which is a separate publicity/consent issue from
      site-visitor data privacy but worth closing out before launch.
