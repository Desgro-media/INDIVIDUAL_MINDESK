package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BankAccountDto {
    private Long id;
    private String accountName;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String upiId;
    private String qrCodeBase64;
    private boolean isDefault;
    private boolean active;
}
