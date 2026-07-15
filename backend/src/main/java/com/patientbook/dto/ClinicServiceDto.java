package com.patientbook.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ClinicServiceDto {
    private Long id;
    private String name;
    private String description;
    private String duration;
    private BigDecimal fee;
    private String icon;
    private boolean active;
    private int displayOrder;
    private String createdAt;
}
