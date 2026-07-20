package com.patientbook.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class PaymentSubmissionRequest {
    @NotBlank
    @Size(max = 100)
    private String upiTransactionRef;

    // Optional — validated server-side (size cap + real image magic bytes),
    // see SubscriptionService.validateScreenshot.
    private String screenshotBase64;

    private BigDecimal amountClaimed;
}
