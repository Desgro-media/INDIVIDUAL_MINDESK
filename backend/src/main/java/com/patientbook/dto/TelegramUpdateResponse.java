package com.patientbook.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.util.List;

@Data
public class TelegramUpdateResponse {
    private boolean ok;
    private List<Update> result;

    @Data
    public static class Update {
        @JsonProperty("update_id")
        private Long updateId;
        private Message message;
    }

    @Data
    public static class Message {
        @JsonProperty("message_id")
        private Long messageId;
        private Chat chat;
        private String text;
    }

    @Data
    public static class Chat {
        private Long id;
        private String type;
    }
}
