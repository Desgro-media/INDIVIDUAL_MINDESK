import type { Metadata } from "next";
import LegalPageShell from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Use — Mindesk",
  description: "The terms that govern use of the Mindesk practice-management and booking platform.",
};

const EFFECTIVE_DATE = "[EFFECTIVE DATE — set this when you publish, e.g. 3 August 2026]";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Use" effectiveDate={EFFECTIVE_DATE}>
      <div className="legal-note">
        <p>
          This is a working draft prepared to get Mindesk to a legally-reasonable starting point
          before launch. It is <strong>not a substitute for review by a qualified lawyer</strong>,
          especially because Mindesk stores mental-health-related information. Anywhere you see{" "}
          <span className="legal-placeholder">bracketed orange text</span>, that is a placeholder —
          fill it in (or have your lawyer fill it in) before this goes live.
        </p>
      </div>

      <h2>1. Who these terms are for</h2>
      <p>
        These Terms of Use ("<strong>Terms</strong>") are a contract between{" "}
        <span className="legal-placeholder">[Your Legal Business Name / Sole Proprietor Name]</span>{" "}
        ("<strong>Mindesk</strong>," "<strong>we</strong>," "<strong>us</strong>") and the person or
        clinic that creates a Mindesk account ("<strong>you</strong>," an "<strong>Account
        Holder</strong>"). If you create a Clinic account, "you" also includes every staff login you
        add — you are responsible for their use of the platform as if it were your own.
      </p>
      <p>
        People who book an appointment through your public booking page (your "<strong>Patients</strong>"
        or "<strong>Clients</strong>") do not sign up for a Mindesk account and are not a party to
        these Terms. Your own relationship with your patients — including what you tell them about
        how their information is stored — is between you and them; see Section 6.
      </p>

      <h2>2. The service</h2>
      <p>
        Mindesk is a booking-page, patient-record, scheduling, invoicing, and analytics platform for
        independent psychologists and clinics. Depending on your account type (Individual or Clinic)
        you get a public booking link, a shared patient roster, appointment and session-note tools,
        invoicing, availability management, and — for clinics — staff logins with configurable
        dashboard permissions. Optional add-ons (email/SMS/WhatsApp notifications, a Telegram-linked
        tracking channel, and an AI chat widget) work only if you or we configure the relevant
        third-party service; the platform runs fine without them.
      </p>
      <p>
        We may add, change, or remove features over time. We'll try not to remove something you rely
        on without notice, but this isn't a guarantee that any specific feature stays unchanged
        forever.
      </p>

      <h2>3. Mindesk is not a healthcare provider</h2>
      <div className="legal-note">
        <p>
          <strong>Mindesk does not provide medical, psychological, or crisis care, and does not
          monitor your patients in real time.</strong> Features like the mood check-in (patient
          self-reported 1–10 score) and the risk flag on a patient record are note-taking and
          organization tools for you, the practitioner — nobody at Mindesk is watching for a
          concerning score or a flagged patient, and submitting one does not trigger any emergency
          response from us. If a patient may be in crisis or danger, you are solely responsible for
          following your own professional and legal obligations (including directing them to
          emergency services or a crisis line).
        </p>
      </div>
      <p>
        You represent that you (and anyone you add as a bookable staff psychologist) hold whatever
        licenses, registrations, or qualifications are legally required to provide the services you
        offer through your booking page, in the jurisdiction(s) where you practice. We do not verify
        credentials and take no responsibility for the clinical judgment, advice, or care you provide
        — that is entirely yours.
      </p>

      <h2>4. Accounts, staff, and security</h2>
      <ul>
        <li>You must be at least 18 to create an account, and must give accurate information at signup.</li>
        <li>You're responsible for keeping your login credentials confidential and for all activity under your account, including anything a staff login you created does.</li>
        <li>If you run a Clinic account, only you (the tenant owner) can create, edit, or deactivate staff logins — staff cannot manage each other. Deactivating a staff member blocks their access immediately but keeps their name attached to the appointments, notes, and invoices they created, so your records stay intact.</li>
        <li>There is currently no self-service "forgot password" flow. If you're locked out, contact us at <span className="legal-placeholder">[support email]</span> to verify your identity and have it reset.</li>
        <li>Tell us promptly at <span className="legal-placeholder">[support email]</span> if you suspect unauthorized access to your account.</li>
      </ul>

      <h2>5. Subscription, trial, and payment</h2>
      <ul>
        <li>New accounts get a 14-day free trial. After that, the subscription is <strong>₹4,999/year for an Individual account</strong> or <strong>₹9,999/year for a Clinic account</strong> — clinics don't pay per staff seat on top of that.</li>
        <li>Mindesk does not use a payment gateway and does not collect or store card numbers. You pay via UPI/GPay to our published UPI ID outside the app, then submit your transaction reference (UTR) and, optionally, a screenshot as proof from your dashboard's Subscription page. A human reviewer approves or rejects each submission — it is not instant.</li>
        <li>If your subscription lapses, we block access to your dashboard until you renew. Your <strong>public booking page keeps working</strong> so existing patients can still book — we don't cut off patient access as leverage.</li>
        <li>
          <span className="legal-placeholder">
            [Refund policy — placeholder default: fees already paid are non-refundable except where
            required by law. Decide your real policy and replace this line before launch.]
          </span>
        </li>
        <li>We may change pricing going forward; we'll give existing subscribers reasonable notice before a renewal is affected.</li>
      </ul>

      <h2>6. Your responsibilities for patient data</h2>
      <p>
        Everything you enter about a patient — contact details, session notes, mood scores, risk
        flags, attachments — is content you control. As between you and Mindesk, <strong>you are the
        data controller for your patients' information</strong>; we process and store it on your
        behalf so the platform can function. That means:
      </p>
      <ul>
        <li>You're responsible for having a lawful basis and, where required, your patients' consent to record and store their information in Mindesk.</li>
        <li>You're responsible for telling your patients how you handle their data (a link to our <a href="/privacy">Privacy Policy</a> covers our end, but you may need your own notice depending on your jurisdiction and professional body).</li>
        <li>You're responsible for the accuracy of what you enter, and for complying with any healthcare-, telehealth-, or record-keeping regulations that apply to your practice.</li>
        <li>If a patient asks you to correct or delete their information, that request should come to you first; we'll support deletion/export requests routed through you (see the Privacy Policy).</li>
      </ul>

      <h2>7. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use Mindesk for anything unlawful, or to misrepresent your qualifications to patients;</li>
        <li>Try to access another tenant's data, probe, scan, or attempt to bypass the platform's access controls or rate limits;</li>
        <li>Upload malicious files, or content you don't have the right to store;</li>
        <li>Resell, sublicense, or provide the platform to third parties outside your own practice/clinic;</li>
        <li>Interfere with the service's normal operation (e.g. automated scraping of the public booking pages, load-testing without our permission).</li>
      </ul>
      <p>We may suspend or terminate accounts that violate this section, with notice where practical.</p>

      <h2>8. Third-party services</h2>
      <p>
        Some features depend on third-party providers you or we configure — email delivery, SMS/WhatsApp,
        Telegram messaging, and an AI chat assistant. These providers process the data needed to
        perform their function (e.g. a phone number to send an SMS, a chat message to generate a
        reply) under their own terms. See the <a href="/privacy">Privacy Policy</a> for the current
        list. We're not responsible for outages or failures on their end, though we'll degrade
        gracefully — the app keeps working with a channel silently skipped if it's unavailable or
        unconfigured.
      </p>
      <p>
        The AI chat widget answers from a fixed knowledge document about Mindesk and is not connected
        to your patient records — but whatever you type into it is sent to the configured AI provider.
        Don't enter patient-identifying or clinical information into the chat widget.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        Mindesk and its branding, design, and code are owned by us or our licensors. You get a
        limited, non-exclusive, non-transferable right to use the platform for your own practice
        while your subscription is active. You keep ownership of the content you enter (patient
        records, notes, your bio/photo, etc.).
      </p>

      <h2>10. Termination</h2>
      <p>
        You can stop using Mindesk at any time. We may suspend or terminate your account for
        violating these Terms, non-payment beyond the grace we describe in Section 5, or if required
        by law. On termination, your public booking page stops working; we retain your data for the
        period described in the <a href="/privacy">Privacy Policy</a> unless you request earlier
        deletion.
      </p>

      <h2>11. Disclaimers and limitation of liability</h2>
      <div className="legal-note">
        <p>
          The platform is provided "as is" and "as available," without warranties of any kind,
          express or implied. We don't guarantee the service will be uninterrupted, error-free, or
          that it verifies practitioner credentials or monitors clinical risk (see Section 3).
        </p>
        <p>
          To the maximum extent permitted by law, we are not liable for indirect,
          incidental, or consequential damages, or for any loss arising from clinical decisions,
          missed notifications from optional third-party channels, or patient-entered content. Our
          total liability for any claim arising from these Terms or the service is limited to the
          subscription fees you paid us in the 12 months before the claim arose.{" "}
          <span className="legal-placeholder">
            [Have a lawyer confirm this limitation is enforceable in your jurisdiction — some
            consumer-protection regimes restrict how far liability can be limited.]
          </span>
        </p>
      </div>

      <h2>12. Indemnification</h2>
      <p>
        You agree to indemnify and hold us harmless from claims arising out of your use of the
        platform, your violation of these Terms, or your violation of any law or a third party's
        rights (including a patient's rights) in connection with content you enter.
      </p>

      <h2>13. Governing law and disputes</h2>
      <p>
        These Terms are governed by the laws of{" "}
        <span className="legal-placeholder">[India / your state — confirm with counsel]</span>, and
        any dispute will be subject to the exclusive jurisdiction of the courts of{" "}
        <span className="legal-placeholder">[city/state]</span>,{" "}
        <span className="legal-placeholder">
          [optionally: add an arbitration clause here if you'd prefer arbitration over litigation]
        </span>
        .
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. If a change is material, we'll make reasonable
        efforts to notify active subscribers (e.g. by email or an in-dashboard notice) before it
        takes effect. Continuing to use Mindesk after an update means you accept the revised Terms.
      </p>

      <h2>15. Contact</h2>
      <p>
        Questions about these Terms: <span className="legal-placeholder">[support email]</span>
        <br />
        <span className="legal-placeholder">[Legal Business Name and registered address]</span>
      </p>
    </LegalPageShell>
  );
}
