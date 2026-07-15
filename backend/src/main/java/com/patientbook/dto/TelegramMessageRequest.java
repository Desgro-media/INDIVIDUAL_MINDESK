package com.patientbook.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TelegramMessageRequest {
    @JsonProperty("chat_id")
    private String chatId;
    private String text;
}
