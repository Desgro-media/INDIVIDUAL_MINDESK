package com.patientbook.service;

import com.patientbook.entity.ClinicHoliday;
import com.patientbook.entity.ClinicSettings;
import com.patientbook.repository.ClinicHolidayRepository;
import com.patientbook.repository.ClinicSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final ClinicSettingsRepository clinicSettingsRepository;
    private final ClinicHolidayRepository clinicHolidayRepository;

    public ClinicSettings getSettings(Long ownerId) {
        return clinicSettingsRepository.findByPsychologistId(ownerId).orElseGet(() -> {
            ClinicSettings settings = ClinicSettings.builder()
                    .psychologistId(ownerId)
                    .build();
            return clinicSettingsRepository.save(settings);
        });
    }

    public ClinicSettings updateSettings(Long ownerId, ClinicSettings newSettings) {
        ClinicSettings settings = getSettings(ownerId);
        settings.setClinicName(newSettings.getClinicName());
        settings.setDoctorName(newSettings.getDoctorName());
        settings.setAddress(newSettings.getAddress());
        settings.setContactPhone(newSettings.getContactPhone());
        settings.setContactEmail(newSettings.getContactEmail());
        settings.setPaymentQrCodeUrl(newSettings.getPaymentQrCodeUrl());
        settings.setDemoCallNumber(newSettings.getDemoCallNumber());
        settings.setBankAccountName(newSettings.getBankAccountName());
        return clinicSettingsRepository.save(settings);
    }

    public List<ClinicHoliday> getHolidays(Long ownerId) {
        return clinicHolidayRepository.findByPsychologistId(ownerId);
    }

    public ClinicHoliday addHoliday(Long ownerId, ClinicHoliday holiday) {
        holiday.setPsychologistId(ownerId);
        return clinicHolidayRepository.save(holiday);
    }

    public void removeHoliday(Long id, Long ownerId) {
        clinicHolidayRepository.deleteByIdAndPsychologistId(id, ownerId);
    }
}
