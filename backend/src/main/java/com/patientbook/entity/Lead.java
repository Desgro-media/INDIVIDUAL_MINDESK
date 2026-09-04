package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "lead")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Lead {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = true)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(columnDefinition = "TEXT")
    private String notes;

    // NEW or CONVERTED — flips to CONVERTED once this contact goes on to
    // complete a booking (see AppointmentService.bookAppointmentForOwner /
    // LeadService.convertLead).
    @Column(nullable = false)
    @Builder.Default
    private String status = "NEW";

    // The owning practitioner — every lead belongs to exactly one account,
    // same tenant-scoping convention as Patient.primaryPsychologistId.
    @Column(name = "practitioner_id", nullable = false)
    private Long practitionerId;

    // Populated once this lead converts into a real patient/appointment —
    // null for a lead that's still just contact details.
    private Long patientId;
    private Long appointmentId;
    private LocalDateTime convertedAt;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
