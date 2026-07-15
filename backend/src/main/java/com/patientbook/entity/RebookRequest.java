package com.patientbook.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "rebook_request")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RebookRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_appointment_id", nullable = false)
    private Appointment originalAppointment;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "new_appointment_id", nullable = false)
    private Appointment newAppointment;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime rebookedAt;
}
