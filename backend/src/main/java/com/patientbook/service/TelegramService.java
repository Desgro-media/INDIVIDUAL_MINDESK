package com.patientbook.service;

import com.patientbook.dto.TelegramMessageRequest;
import com.patientbook.dto.TelegramUpdateResponse;
import com.patientbook.entity.Appointment;
import com.patientbook.entity.Patient;
import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.PatientRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class TelegramService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${telegram.bot.token}")
    private String botToken;

    private String apiUrl;
    private Long lastUpdateId = 0L;

    @PostConstruct
    public void init() {
        if (botToken != null && !botToken.equals("xxx") && !botToken.isEmpty()) {
            this.apiUrl = "https://api.telegram.org/bot" + botToken;
            log.info("TelegramService initialized.");
        } else {
            log.warn("Telegram bot token not configured.");
        }
    }

    public void sendMessage(String chatId, String text) {
        if (apiUrl == null || chatId == null) return;
        
        try {
            java.util.Map<String, String> request = new java.util.HashMap<>();
            request.put("chat_id", chatId);
            request.put("text", text);
            request.put("parse_mode", "Markdown");
            
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_JSON);
            org.springframework.http.HttpEntity<java.util.Map<String, String>> entity = new org.springframework.http.HttpEntity<>(request, headers);
            
            restTemplate.postForObject(apiUrl + "/sendMessage", entity, String.class);
            log.info("Telegram message sent to chatId {}", chatId);
        } catch (Exception e) {
            log.error("Failed to send Telegram message: {}", e.getMessage());
        }
    }

    @Scheduled(fixedDelay = 3000)
    public void pollUpdates() {
        if (apiUrl == null) return;

        try {
            String url = apiUrl + "/getUpdates?offset=" + (lastUpdateId + 1) + "&timeout=2";
            String rawResponse = restTemplate.getForObject(url, String.class);
            if (rawResponse != null && !rawResponse.contains("\"result\":[]")) {
                log.info("Raw Telegram Response: {}", rawResponse);
            }
            
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
            TelegramUpdateResponse response = mapper.readValue(rawResponse, TelegramUpdateResponse.class);
            
            if (response != null && response.isOk() && response.getResult() != null) {
                for (TelegramUpdateResponse.Update update : response.getResult()) {
                    lastUpdateId = update.getUpdateId();
                    
                    if (update.getMessage() != null && update.getMessage().getText() != null) {
                        String text = update.getMessage().getText();
                        String chatId = String.valueOf(update.getMessage().getChat().getId());
                        
                        if (text.startsWith("/start ")) {
                            String token = text.substring("/start ".length()).trim();
                            handleStartCommand(chatId, token);
                        } else if (text.equals("/start")) {
                            sendMessage(chatId, "Welcome to the Psychologist Clinic Bot! Please click the 'Get Updates on Telegram' button from your appointment tracking page to link your account.");
                        }
                    }
                }
            }
        } catch (Exception e) {
            // Log at debug to avoid spamming on network issues
            log.error("Error polling Telegram updates: {}", e.getMessage(), e);
        }
    }

    private void handleStartCommand(String chatId, String token) {
        Optional<Appointment> appointmentOpt = appointmentRepository.findByTrackingTokenWithPatient(token);
        if (appointmentOpt.isPresent()) {
            Appointment appointment = appointmentOpt.get();
            Patient patient = appointment.getPatient();
            
            // Link telegram chat ID
            patient.setTelegramChatId(chatId);
            patientRepository.save(patient);
            
            // Send welcome & status message
            String message = String.format("Hi %s! 👋\n\nYour Telegram is now connected. Your appointment request for %s at %s is currently *%s*.\n\nWe will notify you here when the status changes.",
                    patient.getName(), appointment.getAppointmentDate(), appointment.getStartTime(), appointment.getStatus());
            
            sendMessage(chatId, message);
            log.info("Linked Telegram chat {} to patient {}", chatId, patient.getId());
        } else {
            sendMessage(chatId, "Sorry, I couldn't find an appointment with that tracking token.");
        }
    }
}
