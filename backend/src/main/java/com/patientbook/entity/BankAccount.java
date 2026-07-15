package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "bank_account")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "psychologist_id", nullable = false)
    private Long psychologistId;

    private String accountName;
    private String bankName;
    private String accountNumber;
    private String ifscCode;
    private String upiId;

    @Column(columnDefinition = "TEXT")
    private String qrCodeBase64;

    @Column(nullable = false)
    private boolean isDefault = false;

    @Column(nullable = false)
    private boolean active = true;
}
