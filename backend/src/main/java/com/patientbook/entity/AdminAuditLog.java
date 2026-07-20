package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

// Append-only trail of every superadmin action that changes a tenant's
// access/billing state. No precedent for this in the codebase (there was no
// admin role before this), but a superadmin who can flip anyone's paid-access
// status needs a durable "who did what, to whom, when" record.
@Entity
@Table(name = "admin_audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_user_id", nullable = false)
    private Long adminUserId;

    @Column(nullable = false)
    private String action;

    @Column(name = "target_psychologist_id")
    private Long targetPsychologistId;

    @Column(columnDefinition = "TEXT")
    private String detail;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
