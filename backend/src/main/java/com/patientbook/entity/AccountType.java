package com.patientbook.entity;

// Only meaningful on a tenant-root AppUser row (tenantId == null) — staff
// rows inherit their tenant's behavior implicitly and leave this null.
public enum AccountType {
    INDIVIDUAL,
    CLINIC
}
