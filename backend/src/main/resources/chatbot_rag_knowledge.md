# App Overview
PatientBook is a clinical ERP and booking application for psychological or clinical services. It allows patients to book and track appointments, log their mood, and rate sessions. It also provides a dashboard for clinic staff to manage patients, appointments, billing, services, and clinic settings.

# User Roles
- **ROLE_SUPER_ADMIN**: Administrator with high-level access. (Specific permissions: Not Provided)
- **ROLE_DOCTOR**: Doctor or Psychologist user. (Specific permissions: Not Provided)
- **ROLE_RECEPTIONIST**: Receptionist user. (Specific permissions: Not Provided)
- **Patient**: End user accessing public interfaces. No account creation is required for patients.

# Navigation Map
## Public Paths
- `/` -> Home page (Content: Not Provided)
- `/login` -> Staff login page
- `/booking` -> Public booking flow
- `/booking/confirmation?token=[REDACTED]` -> Confirmation screen after successful booking
- `/track/[token]` -> Patient appointment tracking page
- `/track/[token]/rebook` -> Link to rebook from a cancelled appointment
- `/mood/[token]` -> Patient mood check-in page

## Dashboard Paths (Staff)
- `/dashboard` -> Overview
- `/dashboard/analytics` -> Analytics
- `/dashboard/appointments` -> Appointments Management
- `/dashboard/patients` -> Patients Directory
- `/dashboard/billing` -> Billing Management
- `/dashboard/services` -> Services Configuration
- `/dashboard/settings` -> Clinic Settings

*Users navigate the public paths via direct links sent through SMS/Email or buttons provided within the flows (e.g., "Review", "Back", "Book a New Slot"). Dashboard users navigate via the sidebar navigation menu.*

# Features by Screen
## Booking Flow (`/booking`)
- **Step 1 (Your Details):** Inputs for Full Name, Email Address, Phone Number, and optional Notes. Buttons: "Continue".
- **Step 2 (Session Type):** Grid showing dynamic services fetched from the backend (shows Name, Duration, Icon). Buttons: "Back", "Continue".
- **Step 3 (Schedule):** Mini calendar and time slots. Disables past dates and clinic holidays. Buttons: "Back", "Review".
- **Step 4 (Confirm):** Summary view of patient details, selected session, date, time, and note. Buttons: "Edit", "Confirm Booking".

## Appointment Tracking (`/track/[token]`)
- **PENDING View:** Displays "Request Under Review" along with appointment date, time, and session type. Contains a "Refresh Status" button. Auto-refreshes every 30 seconds.
- **CONFIRMED View:** Displays "Confirmed" with full appointment details. Contains a "Copy" button to copy the tracking link and a "Back to Home" button.
- **CANCELLED View:** Displays "Appointment Cancelled" and shows the cancellation reason (if provided). Contains "Book a New Slot" and "Back to Home" buttons.
- **COMPLETED View:** Displays a 1-to-5 star rating interface and an optional text area for feedback. Contains a "Submit Rating" button, "Book Another Session" button, and "Back to Home" button.

## Mood Check-In (`/mood/[token]`)
- Displays a grid of 10 emojis representing mood from 1 (Very Low) to 10 (Amazing!).
- Contains an optional text area: "Anything you'd like to share?".
- Contains a "Submit" button.
- Post-submission view displays a success checkmark and a "Thank you!" message.

## Dashboard Layout
- **Sidebar:** Contains navigation links to dashboard sections.
- **Header:** Displays the page title, a mobile menu toggle, theme toggle, notification bell with a badge indicating the number of PENDING appointments, and a user avatar.
- **User Actions:** Includes a "Logout" button that clears local storage tokens and redirects to `/login`.

# Common User Tasks
- **Book an Appointment:** Patient visits `/booking`, fills in their details, selects a session type, chooses an available date/time, and confirms the booking.
- **Track Appointment Status:** Patient opens the `/track/[token]` link received via SMS/Email to view their appointment status (PENDING, CONFIRMED, CANCELLED, or COMPLETED).
- **Rate a Session:** After a session is completed, patient visits their tracking link, selects a star rating, provides optional feedback, and clicks "Submit Rating".
- **Log Mood:** After a session, patient visits `/mood/[token]`, selects a mood score, enters an optional note, and clicks "Submit".
- **Staff Login:** Staff visits `/login`, enters credentials to access the dashboard.
- **Staff Logout:** Staff clicks the logout icon in the dashboard sidebar to exit securely.

# FAQs
- **Q: Do patients need an account to book an appointment?**
  - A: No, patients do not need to register. They only need to provide their basic details (Name, Email, Phone) during the booking flow.
- **Q: How does a patient know their appointment is confirmed?**
  - A: Patients receive an SMS and email notification when the doctor approves it. Their tracking link will also update its status from PENDING to CONFIRMED.
- **Q: What happens if an appointment is cancelled?**
  - A: The tracking link will display a "Cancelled" status along with the cancellation reason, and provide a button to easily "Book a New Slot".
- **Q: Are patient mood logs private?**
  - A: Yes, the mood response is private and only visible to the doctor.

# Business Rules
## Validations
- **Booking Step 1:** Patient Name, Email, and Phone are strictly required. Email must be in a valid format.
- **Booking Steps 2 & 3:** Users cannot proceed without explicitly selecting a Session Type and an available Date & Time slot.
- **Calendar Restrictions:** Past dates and dynamically fetched Clinic Holidays are disabled in the booking calendar.
- **Mood Submission:** A patient must select a mood score (1-10) before the submit button is enabled.
- **Rating Submission:** A patient must select at least 1 star before submitting session feedback.

## Statuses
- **Appointment Statuses:** PENDING, CONFIRMED, CANCELLED, COMPLETED.
- **Invoice Statuses:** UNPAID, PAID, WAIVED.
- **Payment Methods:** CASH, CARD, UPI, INSURANCE.

## Notifications
- Patients receive an automated SMS and email notification when an appointment is successfully approved by the clinic.
- The tracking page polls the system every 30 seconds to fetch the latest appointment status.

## Application Logic
- **Patient Risk Flag:** The system supports flagging a patient with a `riskFlag` and a `riskReason` for clinical monitoring.
- **Session Notes:** Doctors can record session notes using a legacy plain-text format or a structured SOAP format (Subjective, Objective, Assessment, Plan).
- **Authentication:** Dashboard routes verify `[REDACTED]` tokens from local storage; unauthenticated users are redirected to `/login`.

# Glossary
- **Tracking Token:** A unique 25-character string assigned to each appointment, used to generate secure, patient-facing URLs.
- **SOAP:** A clinical note-taking structure standing for Subjective (patient reports), Objective (clinical observations), Assessment (diagnosis/impression), and Plan (treatment/next steps).
- **ClinicService:** A database-backed entity representing a specific type of session offered by the clinic, including its duration, fee, and descriptive icon.

# Application How-To & Navigation Guide
This section provides instructions on how to use specific features within the PatientBook dashboard. Use this information to guide users step-by-step when they ask how to perform an action.

## How to change Working Hours
1. Navigate to the **Settings** page via the left sidebar (`/dashboard/settings`).
2. Scroll down to the **Schedule & Fees** section.
3. Use the **Hours Start** and **Hours End** dropdown menus to adjust your clinic's working hours.
4. Click the **Save Settings** button at the top right of the page.

## How to add or manage Clinic Holidays
1. Navigate to the **Settings** page via the left sidebar.
2. Scroll down to the **Clinic Holidays** section.
3. Use the date picker to select a date, and type a description (e.g., "Christmas Day").
4. Click **Add Holiday**. This date will now be blocked off from the public booking calendar.

## How to manage Appointments
1. Navigate to the **Appointments** page via the left sidebar.
2. You will see a list of all patient appointments.
3. To approve a pending appointment, click on the appointment card and select **Confirm**. This automatically sends an SMS/Email to the patient.
4. To cancel an appointment, click **Cancel**, provide a reason, and confirm.

## How to manage Patients & SOAP Notes
1. Navigate to the **Patients** page via the left sidebar.
2. Click on a patient's name to view their profile.
3. Inside the patient profile, you can view their history, add clinical **SOAP Notes** (Subjective, Objective, Assessment, Plan), and toggle their **Risk Flag** if they need special monitoring.
# App Overview
PatientBook is a clinical ERP and booking application for psychological or clinical services. It allows patients to book and track appointments, log their mood, and rate sessions. It also provides a dashboard for clinic staff to manage patients, appointments, billing, services, and clinic settings.

# User Roles
- **ROLE_SUPER_ADMIN**: Administrator with high-level access. (Specific permissions: Not Provided)
- **ROLE_DOCTOR**: Doctor or Psychologist user. (Specific permissions: Not Provided)
- **ROLE_RECEPTIONIST**: Receptionist user. (Specific permissions: Not Provided)
- **Patient**: End user accessing public interfaces. No account creation is required for patients.

# Navigation Map
## Public Paths
- `/` -> Home page (Content: Not Provided)
- `/login` -> Staff login page
- `/booking` -> Public booking flow
- `/booking/confirmation?token=[REDACTED]` -> Confirmation screen after successful booking
- `/track/[token]` -> Patient appointment tracking page
- `/track/[token]/rebook` -> Link to rebook from a cancelled appointment
- `/mood/[token]` -> Patient mood check-in page

## Dashboard Paths (Staff)
- `/dashboard` -> Overview
- `/dashboard/analytics` -> Analytics
- `/dashboard/appointments` -> Appointments Management
- `/dashboard/patients` -> Patients Directory
- `/dashboard/billing` -> Billing Management
- `/dashboard/services` -> Services Configuration
- `/dashboard/settings` -> Clinic Settings

*Users navigate the public paths via direct links sent through SMS/Email or buttons provided within the flows (e.g., "Review", "Back", "Book a New Slot"). Dashboard users navigate via the sidebar navigation menu.*

# Features by Screen
## Booking Flow (`/booking`)
- **Step 1 (Your Details):** Inputs for Full Name, Email Address, Phone Number, and optional Notes. Buttons: "Continue".
- **Step 2 (Session Type):** Grid showing dynamic services fetched from the backend (shows Name, Duration, Icon). Buttons: "Back", "Continue".
- **Step 3 (Schedule):** Mini calendar and time slots. Disables past dates and clinic holidays. Buttons: "Back", "Review".
- **Step 4 (Confirm):** Summary view of patient details, selected session, date, time, and note. Buttons: "Edit", "Confirm Booking".

## Appointment Tracking (`/track/[token]`)
- **PENDING View:** Displays "Request Under Review" along with appointment date, time, and session type. Contains a "Refresh Status" button. Auto-refreshes every 30 seconds.
- **CONFIRMED View:** Displays "Confirmed" with full appointment details. Contains a "Copy" button to copy the tracking link and a "Back to Home" button.
- **CANCELLED View:** Displays "Appointment Cancelled" and shows the cancellation reason (if provided). Contains "Book a New Slot" and "Back to Home" buttons.
- **COMPLETED View:** Displays a 1-to-5 star rating interface and an optional text area for feedback. Contains a "Submit Rating" button, "Book Another Session" button, and "Back to Home" button.

## Mood Check-In (`/mood/[token]`)
- Displays a grid of 10 emojis representing mood from 1 (Very Low) to 10 (Amazing!).
- Contains an optional text area: "Anything you'd like to share?".
- Contains a "Submit" button.
- Post-submission view displays a success checkmark and a "Thank you!" message.

## Dashboard Layout
- **Sidebar:** Contains navigation links to dashboard sections.
- **Header:** Displays the page title, a mobile menu toggle, theme toggle, notification bell with a badge indicating the number of PENDING appointments, and a user avatar.
- **User Actions:** Includes a "Logout" button that clears local storage tokens and redirects to `/login`.

# Common User Tasks
- **Book an Appointment:** Patient visits `/booking`, fills in their details, selects a session type, chooses an available date/time, and confirms the booking.
- **Track Appointment Status:** Patient opens the `/track/[token]` link received via SMS/Email to view their appointment status (PENDING, CONFIRMED, CANCELLED, or COMPLETED).
- **Rate a Session:** After a session is completed, patient visits their tracking link, selects a star rating, provides optional feedback, and clicks "Submit Rating".
- **Log Mood:** After a session, patient visits `/mood/[token]`, selects a mood score, enters an optional note, and clicks "Submit".
- **Staff Login:** Staff visits `/login`, enters credentials to access the dashboard.
- **Staff Logout:** Staff clicks the logout icon in the dashboard sidebar to exit securely.

# FAQs
- **Q: Do patients need an account to book an appointment?**
  - A: No, patients do not need to register. They only need to provide their basic details (Name, Email, Phone) during the booking flow.
- **Q: How does a patient know their appointment is confirmed?**
  - A: Patients receive an SMS and email notification when the doctor approves it. Their tracking link will also update its status from PENDING to CONFIRMED.
- **Q: What happens if an appointment is cancelled?**
  - A: The tracking link will display a "Cancelled" status along with the cancellation reason, and provide a button to easily "Book a New Slot".
- **Q: Are patient mood logs private?**
  - A: Yes, the mood response is private and only visible to the doctor.

# Business Rules
## Validations
- **Booking Step 1:** Patient Name, Email, and Phone are strictly required. Email must be in a valid format.
- **Booking Steps 2 & 3:** Users cannot proceed without explicitly selecting a Session Type and an available Date & Time slot.
- **Calendar Restrictions:** Past dates and dynamically fetched Clinic Holidays are disabled in the booking calendar.
- **Mood Submission:** A patient must select a mood score (1-10) before the submit button is enabled.
- **Rating Submission:** A patient must select at least 1 star before submitting session feedback.

## Statuses
- **Appointment Statuses:** PENDING, CONFIRMED, CANCELLED, COMPLETED.
- **Invoice Statuses:** UNPAID, PAID, WAIVED.
- **Payment Methods:** CASH, CARD, UPI, INSURANCE.

## Notifications
- Patients receive an automated SMS and email notification when an appointment is successfully approved by the clinic.
- The tracking page polls the system every 30 seconds to fetch the latest appointment status.

## Application Logic
- **Patient Risk Flag:** The system supports flagging a patient with a `riskFlag` and a `riskReason` for clinical monitoring.
- **Session Notes:** Doctors can record session notes using a legacy plain-text format or a structured SOAP format (Subjective, Objective, Assessment, Plan).
- **Authentication:** Dashboard routes verify `[REDACTED]` tokens from local storage; unauthenticated users are redirected to `/login`.

# Glossary
- **Tracking Token:** A unique 25-character string assigned to each appointment, used to generate secure, patient-facing URLs.
- **SOAP:** A clinical note-taking structure standing for Subjective (patient reports), Objective (clinical observations), Assessment (diagnosis/impression), and Plan (treatment/next steps).
- **ClinicService:** A database-backed entity representing a specific type of session offered by the clinic, including its duration, fee, and descriptive icon.

# Application How-To & Navigation Guide
This section provides instructions on how to use specific features within the PatientBook dashboard. Use this information to guide users step-by-step when they ask how to perform an action.

## How to change Working Hours
1. Navigate to the **Settings** page via the left sidebar (`/dashboard/settings`).
2. Scroll down to the **Schedule & Fees** section.
3. Use the **Hours Start** and **Hours End** dropdown menus to adjust your clinic's working hours.
4. Click the **Save Settings** button at the top right of the page.

## How to add or manage Clinic Holidays
1. Navigate to the **Settings** page via the left sidebar.
2. Scroll down to the **Clinic Holidays** section.
3. Use the date picker to select a date, and type a description (e.g., "Christmas Day").
4. Click **Add Holiday**. This date will now be blocked off from the public booking calendar.

## How to manage Appointments
1. Navigate to the **Appointments** page via the left sidebar.
2. You will see a list of all patient appointments.
3. To approve a pending appointment, click on the appointment card and select **Confirm**. This automatically sends an SMS/Email to the patient.
4. To cancel an appointment, click **Cancel**, provide a reason, and confirm.

## How to manage Patients & SOAP Notes
1. Navigate to the **Patients** page via the left sidebar.
2. Click on a patient's name to view their profile.
3. Inside the patient profile, you can view their history, add clinical **SOAP Notes** (Subjective, Objective, Assessment, Plan), and toggle their **Risk Flag** if they need special monitoring.

## How to manage Services
1. Navigate to the **Services** page via the left sidebar.
2. Here you can create, edit, or delete the therapy services you offer (e.g., "Couples Counseling", "Initial Consultation").
3. For each service, you can define the Name, Duration (in minutes), Fee, and choose an icon.

## How to manage the CRM Pipeline / Leads
1. Navigate to the **CRM Pipeline** via the left sidebar (`/dashboard/crm`).
2. Click **+ Add Lead** to manually add a prospective patient. You can enter their Name, Email, Phone, and Source.
3. The board uses a Kanban style layout. You can drag and drop leads across different columns/stages (e.g., New, Contacted, Converted) as they progress through your sales funnel.
4. Clicking on a lead opens a detail view to update their status or add notes.

## How to manage Billing and Invoices
1. Navigate to the **Billing** page via the left sidebar (`/dashboard/billing`).
2. Here you can view a list of all invoices (UNPAID, PAID, WAIVED).
3. To create a new invoice for a patient, click **Generate Invoice**.
4. To record a payment, click on an UNPAID invoice and select **Mark as Paid**, choosing the payment method (CASH, CARD, UPI, INSURANCE).

## How to use Analytics
1. Navigate to the **Analytics** page via the left sidebar (`/dashboard/analytics`).
2. Here you can view various charts and insights about your clinic's performance, including total bookings, revenue, and attendance rates.
3. The **Smart Alerts** section provides automated notifications about your clients. It includes:
   - **Follow-ups Due**: Alerts you when clients need a follow-up appointment.
   - **Inactive Clients**: Detects and lists clients who haven't booked a session in a while, allowing you to re-engage them.
