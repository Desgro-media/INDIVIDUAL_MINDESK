package com.patientbook.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class ChatService {

    @Value("${chat.base-url}")
    private String baseUrl;

    @Value("${chat.api-key}")
    private String apiKey;

    @Value("${chat.model}")
    private String model;

    private String systemPromptContent;
    private final RestTemplate restTemplate = new RestTemplate();

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("chatbot_rag_knowledge.md");
            if (resource.exists()) {
                String ragContent = StreamUtils.copyToString(resource.getInputStream(), StandardCharsets.UTF_8);
                this.systemPromptContent = "You are an AI assistant for this practice. Answer the user's questions strictly using the following knowledge base. Do not invent features or provide information outside of this text. Keep your responses concise and friendly. If you don't know the answer based on the text, say 'I don't know'.\n\nKNOWLEDGE BASE:\n" + ragContent;
            } else {
                this.systemPromptContent = "You are an AI assistant for this practice. However, my knowledge base file was not found.";
            }
        } catch (IOException e) {
            this.systemPromptContent = "You are an AI assistant for this practice.";
        }
    }

    public String chat(String message) {
        if (apiKey == null || apiKey.isBlank()) {
            return "The chat assistant isn't configured for this practice yet.";
        }
        try {
            String invokeUrl = baseUrl + "/v1/chat/completions";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);
            headers.set("Accept", "application/json");

            Map<String, Object> payload = new HashMap<>();
            payload.put("model", model);
            payload.put("max_tokens", 1024);
            payload.put("temperature", 0.70);

            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", systemPromptContent));
            messages.add(Map.of("role", "user", "content", message));
            payload.put("messages", messages);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);

            ResponseEntity<Map> response = restTemplate.postForEntity(invokeUrl, request, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                List<Map<String, Object>> choices = (List<Map<String, Object>>) response.getBody().get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
                    return (String) messageObj.get("content");
                }
            }
            return "I received an empty response from the AI.";

        } catch (Exception e) {
            e.printStackTrace();
            return "I'm sorry, I'm having trouble connecting to the AI service right now. Please try again later.";
        }
    }
}
