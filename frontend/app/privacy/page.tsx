import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — Mindesk",
  description: "What personal data Mindesk collects, why, and how it's protected.",
};

const EFFECTIVE_DATE = "[EFFECTIVE DATE — set this when you publish, e.g. 3 August 2026]";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" effectiveDate={EFFECTIVE_DATE}>
      <div className="legal-note">
        <p>
          This is a working draft, built directly from what the Mindesk codebase actually stores and
          sends today — not generic boilerplate. It is <strong>not a substitute for review by a
          qualified lawyer</strong>, particularly because this platform handles mental-health-related
          information, which most privacy laws treat as sensitive/special-category data.{" "}
          <span className="legal-placeholder">Bracketed orange text</span> marks placeholders you need
          to fill in before this goes live.
        </p>
      </div>

      <h2>1. Two kinds of people this policy covers</h2>
      <p>
        Mindesk is practice-management software used by psychologists and clinics ("
        <strong>Practitioners</strong>," "<strong>you</strong>" if you hold an account). Practitioners
        use it to manage their own patients ("<strong>Patients</strong>"), who never create a Mindesk
        account.
      </p>
      <p>
        For a Practitioner's account data (login, profile, billing), Mindesk is the{" "}
        <strong>data controller</strong>. For the Patient data a Practitioner enters into the
        platform, Mindesk acts as a <strong>data processor</strong> on that Practitioner's behalf —
        the Practitioner controls that data and is responsible for their own patients' consent and
        rights (see the Terms of Use, Section 6). This policy describes what we, as the platform,
        collect and how we handle it either way.
      </p>

      <h2>2. Data we collect</h2>

      <h3>2.1 Practitioner / clinic staff account data</h3>
      <ul>
        <li>Name, login email, phone number, and password (stored as a one-way BCrypt hash — we never store or can retrieve your plaintext password)</li>
        <li>Job title, bio, and profile photo, if you add them</li>
        <li>Account type (Individual or Clinic) and, for clinics, the clinic name and your public booking-page slug</li>
        <li>For clinic staff logins: role (Psychologist/Receptionist/Staff), which dashboard sections they're permitted to see, whether they're bookable, and whether their login is active or deactivated</li>
        <li>Login/logout timestamps for clinic staff (attendance history, visible to the clinic owner)</li>
        <li>Your own payout details, if you add a bank account: account holder name, bank name, account number, IFSC code, UPI ID, and an optional payment QR code image — this is <em>your</em> banking information for receiving payments from your patients, not payment-card data, and is never shared with other tenants</li>
      </ul>

      <h3>2.2 Patient / client data (entered by a Practitioner)</h3>
      <ul>
        <li>Name, phone number (used to recognize a returning patient), and email if provided</li>
        <li>Risk flag and risk reason, and free-text clinical/additional notes</li>
        <li>Structured session notes (Subjective/Objective/Assessment/Plan) and a legacy free-text notes field</li>
        <li>Self-reported mood check-in scores (1–10), submitted by the patient via a private tokenized link after a session, no login required</li>
        <li>File attachments uploaded to a patient's record</li>
        <li>Telegram chat ID, if the patient links their Telegram account for notifications</li>
        <li>How the patient was sourced (e.g. direct link, referral) if the Practitioner records it</li>
        <li>Appointment history: date/time, service/session type, status, and a unique tracking-link token used for the status/payment/rebooking page</li>
      </ul>
      <div className="legal-note">
        <p>
          Session notes, risk flags, and mood scores are health-related information. We treat this as
          sensitive data: it's isolated per Practitioner/clinic at the database level, never visible
          across tenants, and never used by us for anything other than operating the platform (we do
          not use it for advertising, profiling, or resale — see Section 4).
        </p>
      </div>

      <h3>2.3 Billing and subscription data</h3>
      <ul>
        <li>Per-appointment invoices: amount, discount, payment method, and which of your bank accounts it was paid to</li>
        <li>Your own platform-subscription payment proof: a UPI transaction reference (UTR) and, optionally, a screenshot, submitted when you pay your subscription (₹4,999/year for an Individual account, ₹9,999/year for a Clinic account). We do not use a payment gateway and do not collect or store card numbers.</li>
      </ul>

      <h3>2.4 Communications content</h3>
      <ul>
        <li>Messages you type into the AI chat widget are sent to our configured AI provider to generate a reply (see Section 4). We don't attach your account or patient identity to that request.</li>
        <li>We keep a log of notification attempts (appointment reminders etc.) recording the channel and whether it succeeded or failed — this log does not store the message content itself.</li>
      </ul>

      <h3>2.5 Technical data</h3>
      <ul>
        <li>A session token (JWT) is stored in your browser's local storage and mirrored into a first-party cookie (<code>individual_token</code>) purely so the dashboard can check you're logged in — this is not an advertising or tracking cookie, and we don't currently use any third-party analytics, advertising, or tracking cookies on the site.</li>
        <li>IP address, used only to rate-limit login/signup/booking endpoints against abuse, and — optionally, if a superadmin enables it — to restrict the admin dashboard to an allowed list of IPs.</li>
        <li>A record of administrative actions performed by our own platform-admin (superadmin) account, kept for accountability.</li>
      </ul>

      <h2>3. Why we collect it</h2>
      <ul>
        <li><strong>To provide the service</strong> — running your booking page, calendar, patient roster, notes, invoicing, and analytics.</li>
        <li><strong>To operate your subscription</strong> — tracking your trial/paid status and verifying payment proof you submit.</li>
        <li><strong>To send notifications</strong> — appointment confirmations/reminders by email, SMS, WhatsApp, or Telegram, where you've configured that channel.</li>
        <li><strong>To keep the platform secure</strong> — rate-limiting abuse, isolating each tenant's data, and maintaining an audit trail of admin actions.</li>
        <li><strong>To respond to support requests</strong> and comply with legal obligations.</li>
      </ul>
      <p>We do not sell personal data, and we do not use patient data for advertising.</p>

      <h2>4. Who we share data with</h2>
      <p>
        We don't share personal data with third parties except where a feature you use requires it, or
        where the law requires it of us:
      </p>
      <ul>
        <li><strong>Email delivery</strong> (Resend) — if configured, to send notification emails.</li>
        <li><strong>SMS / WhatsApp</strong> (Twilio) — if configured, to send text/WhatsApp notifications; this shares the recipient's phone number and message content with Twilio for delivery.</li>
        <li><strong>Telegram</strong> — if a patient links their Telegram account, outbound notifications are sent via the Telegram Bot API.</li>
        <li><strong>AI chat assistant</strong> — an OpenAI-compatible chat-completions API (the specific provider is configurable by us) receives whatever text is typed into the chat widget, to generate a reply. It does not receive patient records.</li>
        <li><strong>Hosting &amp; infrastructure</strong> — our database and backend run on <span className="legal-placeholder">[cloud provider, e.g. AWS/EC2]</span>; the web frontend is hosted on Vercel. These providers process data as infrastructure hosts, under their own security and data-processing terms.</li>
        <li><strong>Legal requirements</strong> — if required to comply with a law, court order, or to protect the rights, safety, or property of Mindesk, our users, or others.</li>
      </ul>
      <p>We do not use a data broker, and we do not share data across unrelated tenants — one Practitioner's data is never visible to another.</p>

      <h2>5. Where and how data is stored</h2>
      <p>
        All application data — including file attachments and payment screenshots — is stored in a
        single PostgreSQL database operated by us, isolated per tenant at the application layer.
        Passwords are hashed with BCrypt and never stored in plaintext. Every tenant-scoped record is
        looked up with an ownership check, so a wrong or mismatched ID returns a generic "not found"
        rather than leaking whether a record exists elsewhere. The site sends security headers
        (CSP/HSTS/frame-deny) and login failures use a deliberately generic message so accounts can't
        be enumerated by guessing.
      </p>
      <p>
        <span className="legal-placeholder">
          [Confirm where your production database is physically hosted, and add that region here —
          this matters for cross-border transfer disclosures.]
        </span>
      </p>

      <h2>6. Data retention</h2>
      <p>
        We keep account and patient data for as long as your subscription is active, plus a period
        afterward to allow reactivation and to meet record-keeping obligations. Deactivating a staff
        login blocks their access but keeps their historical appointments, invoices, and notes intact
        under their name.
      </p>
      <p>
        <span className="legal-placeholder">
          [Decide and state a concrete retention period — e.g. "for 12 months after account
          cancellation, then deleted or anonymized" — and how a Practitioner or Patient can request
          earlier deletion. This isn't automated yet, so document the manual process you'll actually
          follow.]
        </span>
      </p>

      <h2>7. Your rights, and your patients' rights</h2>
      <p>
        If you're a Practitioner, you can access, correct, or export your account data from your
        dashboard, or contact us at <span className="legal-placeholder">[support email]</span>.
      </p>
      <p>
        If you're a Patient and want to access, correct, or delete information a Practitioner holds
        about you in Mindesk, please contact that Practitioner directly first — they control your
        record. If you're unable to reach them, contact us at{" "}
        <span className="legal-placeholder">[support email]</span> and we'll assist consistent with
        our role as processor.
      </p>
      <p>
        Depending on where you're located, you may have additional rights (e.g. under India's Digital
        Personal Data Protection Act, 2023, or other applicable data protection law) to access,
        correct, or erase your data, or to file a complaint with a data protection authority.
      </p>

      <h2>8. Children's data</h2>
      <p>
        Mindesk accounts are for adults (18+). Some Practitioners on the platform may treat minors as
        patients — if you do, you are responsible for obtaining appropriate parental/guardian consent
        before entering a minor's information into Mindesk; we do not independently verify this.
      </p>

      <h2>9. Cookies</h2>
      <p>
        We use one first-party cookie to keep you signed in to the dashboard. We do not currently use
        analytics, advertising, or third-party tracking cookies.{" "}
        <span className="legal-placeholder">
          [If you add analytics/ads later, update this section and add a cookie-consent banner where
          required by law.]
        </span>
      </p>

      <h2>10. Security</h2>
      <p>
        We use industry-standard measures appropriate to the sensitivity of this data — password
        hashing, per-request tenant-isolation checks, rate limiting on public endpoints, immediate
        revocation of deactivated staff sessions, and locked-down security headers. No system is
        perfectly secure, and we can't guarantee absolute security, but we take the sensitivity of
        health-related information seriously in how the platform is built.
      </p>

      <h2>11. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be announced to
        active subscribers (e.g. by email or an in-dashboard notice) before they take effect.
      </p>

      <h2>12. Contact / Grievance Officer</h2>
      <p>
        For privacy questions or requests: <span className="legal-placeholder">[support email]</span>
        <br />
        Grievance Officer (for data-protection complaints):{" "}
        <span className="legal-placeholder">[name and contact email — recommended/required in some jurisdictions for handling data-subject complaints]</span>
        <br />
        <span className="legal-placeholder">[Legal Business Name and registered address]</span>
      </p>
    </LegalPageShell>
  );
}
