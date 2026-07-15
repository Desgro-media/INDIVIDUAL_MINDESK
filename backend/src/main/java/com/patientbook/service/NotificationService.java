package com.patientbook.service;

import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import com.patientbook.entity.Appointment;
import com.patientbook.repository.AppointmentRepository;

@Service
@EnableAsync
@Slf4j
public class NotificationService {

    @Autowired
    private AppointmentRepository appointmentRepository;

    @Autowired
    private TelegramService telegramService;

    @Value("${resend.api-key}")
    private String resendApiKey;

    @Value("${resend.from-email}")
    private String fromEmail;

    @Value("${app.base.url}")
    private String appBaseUrl;

    @Value("${twilio.account.sid}")
    private String twilioAccountSid;

    @Value("${twilio.auth.token}")
    private String twilioAuthToken;

    @Value("${twilio.phone.number}")
    private String twilioPhoneNumber;

    @Value("${twilio.whatsapp.number}")
    private String twilioWhatsappNumber;

    @PostConstruct
    public void init() {
        if (!twilioAccountSid.contains("xxx")) {
            Twilio.init(twilioAccountSid, twilioAuthToken);
        }
    }

    @Async
    public void sendBookingConfirmation(String name, String email, String phone,
                                         String date, String time, String token) {
        String trackingLink = appBaseUrl + "/track/" + token;
        String html = buildEmailHtml(
            "Appointment Request Received",
            name,
            "Your appointment request has been submitted and is awaiting doctor approval. You'll receive another notification once it's confirmed.",
            date, time,
            "<a href='" + trackingLink + "' style='display:inline-block;padding:12px 28px;background:#4f6ef7;color:#fff;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px;'>Track My Appointment</a>",
            "#f59e0b"
        );
        String smsText = String.format(
            "Hi %s! Appointment request received for %s at %s. Track status: %s",
            name, date, time, trackingLink);

        sendEmail(email, "Appointment Received — Awaiting Approval", html);
        sendSmsAndWhatsapp(phone, smsText);
        sendTelegramIfLinked(token, smsText);
    }

    @Async
    public void sendBookingApproved(String name, String email, String phone,
                                     String date, String time, String token) {
        String trackingLink = appBaseUrl + "/track/" + token;
        String html = buildEmailHtml(
            "Appointment Confirmed ✓",
            name,
            "Great news! The doctor has approved your appointment. Please make sure to arrive on time.",
            date, time,
            "<a href='" + trackingLink + "' style='display:inline-block;padding:12px 28px;background:#00c48c;color:#fff;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px;'>View Appointment Details</a>",
            "#00c48c"
        );
        String smsText = String.format(
            "Great news, %s! Your appointment on %s at %s has been CONFIRMED. Details: %s",
            name, date, time, trackingLink);

        sendEmail(email, "Appointment Confirmed ✓", html);
        sendSmsAndWhatsapp(phone, smsText);
        sendTelegramIfLinked(token, smsText);
    }

    @Async
    public void sendPaymentLink(String name, String email, String phone,
                                     String date, String time, String token) {
        String trackingLink = appBaseUrl + "/track/" + token;
        String html = buildEmailHtml(
            "Action Required: Complete Payment",
            name,
            "Your appointment has been booked! To confirm your slot, please complete the payment and upload your screenshot via the link below.",
            date, time,
            "<a href='" + trackingLink + "' style='display:inline-block;padding:12px 28px;background:#f59e0b;color:#fff;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px;'>Pay Now to Confirm</a>",
            "#f59e0b"
        );
        String smsText = String.format(
            "Hi %s! Your appointment on %s at %s is booked. Please complete payment and upload your screenshot to confirm: %s",
            name, date, time, trackingLink);

        sendEmail(email, "Action Required: Complete Payment", html);
        sendSmsAndWhatsapp(phone, smsText);
        sendTelegramIfLinked(token, smsText);
    }

    @Async
    public void sendBookingCancelled(String name, String email, String phone,
                                      String date, String time, String token, String cancellationReason) {
        String rebookLink = appBaseUrl + "/track/" + token + "/rebook";
        String reasonNote = (cancellationReason != null && !cancellationReason.isBlank())
            ? "<p style='margin:0 0 16px;padding:12px 16px;background:#fef2f2;border-left:3px solid #f43f5e;border-radius:8px;font-size:13px;color:#7f1d1d;'><strong>Reason:</strong> " + cancellationReason + "</p>"
            : "";
        String html = buildEmailHtml(
            "Appointment Cancelled",
            name,
            "Unfortunately your appointment has been cancelled." + (cancellationReason != null ? " Reason: " + cancellationReason : "") + " You can easily rebook a new slot.",
            date, time,
            reasonNote + "<a href='" + rebookLink + "' style='display:inline-block;padding:12px 28px;background:#4f6ef7;color:#fff;border-radius:50px;text-decoration:none;font-weight:600;font-size:14px;'>Book a New Slot</a>",
            "#f43f5e"
        );
        String smsText = String.format(
            "Hi %s, your appointment on %s at %s was cancelled. Rebook here: %s",
            name, date, time, rebookLink);

        sendEmail(email, "Appointment Cancelled", html);
        sendSmsAndWhatsapp(phone, smsText);
        sendTelegramIfLinked(token, smsText);
    }

    private void sendTelegramIfLinked(String token, String text) {
        appointmentRepository.findByTrackingTokenWithPatient(token).ifPresent(appointment -> {
            String chatId = appointment.getPatient().getTelegramChatId();
            if (chatId != null && !chatId.isBlank()) {
                telegramService.sendMessage(chatId, text);
            }
        });
    }

    private void sendEmail(String toEmail, String subject, String html) {
        try {
            Resend resend = new Resend(resendApiKey);
            CreateEmailOptions options = CreateEmailOptions.builder()
                .from("PatientBook <" + fromEmail + ">")
                .to(toEmail)
                .subject(subject)
                .html(html)
                .build();
            resend.emails().send(options);
            log.info("Email sent via Resend to {}", toEmail);
        } catch (Exception e) {
            log.error("Failed to send email to {} via Resend: {}", toEmail, e.getMessage());
        }
    }

    private void sendSmsAndWhatsapp(String phone, String text) {
        if (twilioAccountSid.contains("xxx")) return;
        String formatted = formatPhoneNumber(phone);
        try {
            Message.creator(new PhoneNumber(formatted), new PhoneNumber(twilioPhoneNumber), text).create();
            log.info("SMS sent to {}", formatted);
        } catch (Exception e) {
            log.error("SMS failed to {}: {}", formatted, e.getMessage());
        }
        try {
            Message.creator(new PhoneNumber("whatsapp:" + formatted), new PhoneNumber("whatsapp:" + twilioWhatsappNumber), text).create();
            log.info("WhatsApp sent to {}", formatted);
        } catch (Exception e) {
            log.error("WhatsApp failed to {}: {}", formatted, e.getMessage());
        }
    }

    private String formatPhoneNumber(String phone) {
        if (phone != null && phone.matches("^\\d{10}$")) return "+91" + phone;
        if (phone != null && !phone.startsWith("+")) return "+" + phone;
        return phone;
    }

    private String buildEmailHtml(String title, String name, String message,
                                   String date, String time, String ctaHtml, String accentColor) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1'></head>" +
            "<body style='margin:0;padding:0;background:#f0f2ff;font-family:Inter,-apple-system,sans-serif;'>" +
            "<table width='100%' cellpadding='0' cellspacing='0' style='padding:40px 20px;'><tr><td align='center'>" +
            "<table width='560' cellpadding='0' cellspacing='0' style='background:rgba(255,255,255,0.9);border-radius:24px;overflow:hidden;box-shadow:0 8px 40px rgba(79,110,247,0.10);border:1px solid rgba(200,210,255,0.5);'>" +
            // Header strip
            "<tr><td style='background:" + accentColor + ";padding:28px 36px;'>" +
            "<h1 style='margin:0;font-size:20px;font-weight:800;color:#fff;letter-spacing:-0.03em;'>PatientBook</h1>" +
            "<p style='margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.80);'>" + title + "</p>" +
            "</td></tr>" +
            // Body
            "<tr><td style='padding:36px 36px 28px;'>" +
            "<p style='margin:0 0 8px;font-size:22px;font-weight:800;color:#1b2048;letter-spacing:-0.02em;'>Hi " + name + " 👋</p>" +
            "<p style='margin:0 0 28px;font-size:15px;color:#4a5282;line-height:1.65;'>" + message + "</p>" +
            // Detail card
            "<div style='background:#f4f6ff;border-radius:16px;padding:20px 24px;margin-bottom:28px;border:1px solid rgba(180,196,255,0.4);'>" +
            "<table width='100%' cellpadding='0' cellspacing='0'>" +
            "<tr><td style='padding-bottom:12px;'>" +
            "<p style='margin:0;font-size:10px;font-weight:700;color:#8a90bc;text-transform:uppercase;letter-spacing:0.08em;'>Date</p>" +
            "<p style='margin:4px 0 0;font-size:15px;font-weight:600;color:#1b2048;'>" + date + "</p>" +
            "</td></tr>" +
            "<tr><td>" +
            "<p style='margin:0;font-size:10px;font-weight:700;color:#8a90bc;text-transform:uppercase;letter-spacing:0.08em;'>Time</p>" +
            "<p style='margin:4px 0 0;font-size:15px;font-weight:600;color:#1b2048;'>" + time + "</p>" +
            "</td></tr></table></div>" +
            // CTA
            "<div style='text-align:center;margin-bottom:8px;'>" + ctaHtml + "</div>" +
            "</td></tr>" +
            // Footer
            "<tr><td style='padding:20px 36px;border-top:1px solid rgba(180,196,255,0.3);'>" +
            "<p style='margin:0;font-size:12px;color:#8a90bc;text-align:center;'>Sent by PatientBook &mdash; secure appointment management</p>" +
            "</td></tr>" +
            "</table></td></tr></table></body></html>";
    }
}
