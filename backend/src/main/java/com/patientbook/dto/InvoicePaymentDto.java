package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class InvoicePaymentDto {
    private Long id;
    private BigDecimal amount;
    private String paymentMethod;
    private String bankAccountName;
    private String remark;
    private LocalDateTime paidAt;
}
