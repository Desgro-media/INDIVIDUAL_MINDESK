package com.patientbook.repository;

import com.patientbook.entity.DoctorServicePrice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorServicePriceRepository extends JpaRepository<DoctorServicePrice, Long> {
    List<DoctorServicePrice> findByPsychologistId(Long psychologistId);
    List<DoctorServicePrice> findByPsychologistIdAndOfferedTrue(Long psychologistId);
    Optional<DoctorServicePrice> findByPsychologistIdAndClinicServiceId(Long psychologistId, Long clinicServiceId);
    void deleteByPsychologistId(Long psychologistId);
}
