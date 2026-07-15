package com.patientbook.service;

import com.patientbook.repository.AppointmentRepository;
import com.patientbook.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReportService {

    private final AppointmentRepository appointmentRepository;
    private final PatientRepository patientRepository;

    public Map<String, Object> getSummary(Long ownerId) {
        long totalPatients = patientRepository.findByPrimaryPsychologistId(ownerId).size();
        long totalAppointments = appointmentRepository.findByPsychologistId(ownerId).size();
        long awaitingPayment    = appointmentRepository.findByPsychologistId(ownerId).stream()
                .filter(a -> "AWAITING_PAYMENT".equals(a.getStatus())).count();
        long paymentUnderReview = appointmentRepository.findByPsychologistId(ownerId).stream()
                .filter(a -> "PAYMENT_UNDER_REVIEW".equals(a.getStatus())).count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalPatients", totalPatients);
        summary.put("totalAppointments", totalAppointments);
        summary.put("awaitingPayment", awaitingPayment);
        summary.put("paymentUnderReview", paymentUnderReview);
        summary.put("pendingAppointments", awaitingPayment); // kept for backward compat
        return summary;
    }

    public Map<String, Object> getTrends(String range) {
        // Dummy implementation for line charts
        Map<String, Object> trends = new HashMap<>();
        trends.put("range", range);
        trends.put("data", new int[]{10, 20, 15, 30, 25});
        return trends;
    }

    public Map<String, Object> getBusiest() {
        // Dummy implementation for bar charts
        Map<String, Object> busiest = new HashMap<>();
        busiest.put("Monday", 15);
        busiest.put("Tuesday", 20);
        return busiest;
    }
}
