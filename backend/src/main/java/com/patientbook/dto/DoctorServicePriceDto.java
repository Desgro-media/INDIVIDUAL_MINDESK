package com.patientbook.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DoctorServicePriceDto {
    private Long id;
    private Long clinicServiceId;
    private String serviceName;
    private String serviceDescription;
    private String serviceDuration;
    private String serviceIcon;
    private BigDecimal price;
    private boolean offered;
}
