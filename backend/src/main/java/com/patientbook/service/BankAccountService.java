package com.patientbook.service;

import com.patientbook.dto.BankAccountDto;
import com.patientbook.entity.BankAccount;
import com.patientbook.repository.BankAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BankAccountService {

    private final BankAccountRepository bankAccountRepository;

    public List<BankAccountDto> getAllBankAccounts(Long ownerId) {
        return bankAccountRepository.findByPsychologistIdOrderByIsDefaultDescAccountNameAsc(ownerId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // Public-safe list — used by PublicController for the patient payment page
    public List<BankAccountDto> getActiveBankAccounts(Long ownerId) {
        return bankAccountRepository.findByPsychologistIdAndActiveTrue(ownerId)
                .stream().map(this::toPublicDto).collect(Collectors.toList());
    }

    @Transactional
    public BankAccountDto createBankAccount(BankAccountDto dto, Long ownerId) {
        BankAccount account = BankAccount.builder()
                .psychologistId(ownerId)
                .accountName(dto.getAccountName())
                .bankName(dto.getBankName())
                .accountNumber(dto.getAccountNumber())
                .ifscCode(dto.getIfscCode())
                .upiId(dto.getUpiId())
                .qrCodeBase64(dto.getQrCodeBase64())
                .isDefault(dto.isDefault())
                .active(true)
                .build();
        if (dto.isDefault()) clearOtherDefaults(null, ownerId);
        return toDto(bankAccountRepository.save(account));
    }

    @Transactional
    public BankAccountDto updateBankAccount(Long id, Long ownerId, BankAccountDto dto) {
        BankAccount account = bankAccountRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));
        if (dto.getAccountName() != null) account.setAccountName(dto.getAccountName());
        if (dto.getBankName() != null) account.setBankName(dto.getBankName());
        if (dto.getAccountNumber() != null) account.setAccountNumber(dto.getAccountNumber());
        if (dto.getIfscCode() != null) account.setIfscCode(dto.getIfscCode());
        if (dto.getUpiId() != null) account.setUpiId(dto.getUpiId());
        if (dto.getQrCodeBase64() != null) account.setQrCodeBase64(dto.getQrCodeBase64());
        if (dto.isDefault() && !account.isDefault()) {
            clearOtherDefaults(id, ownerId);
            account.setDefault(true);
        }
        return toDto(bankAccountRepository.save(account));
    }

    @Transactional
    public BankAccountDto setDefault(Long id, Long ownerId) {
        clearOtherDefaults(id, ownerId);
        BankAccount account = bankAccountRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));
        account.setDefault(true);
        return toDto(bankAccountRepository.save(account));
    }

    @Transactional
    public void deleteBankAccount(Long id, Long ownerId) {
        BankAccount account = bankAccountRepository.findByIdAndPsychologistId(id, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Bank account not found: " + id));
        account.setActive(false);
        bankAccountRepository.save(account);
    }

    // Resolve bank display name for invoices: prefer default active account, fall back to any active
    public String resolveDefaultBankName(Long ownerId) {
        return bankAccountRepository.findByPsychologistIdAndIsDefaultTrueAndActiveTrue(ownerId)
                .map(b -> b.getAccountName() != null ? b.getAccountName() : b.getBankName())
                .orElseGet(() -> bankAccountRepository.findByPsychologistIdAndActiveTrue(ownerId).stream().findFirst()
                        .map(b -> b.getAccountName() != null ? b.getAccountName() : b.getBankName())
                        .orElse(null));
    }

    private void clearOtherDefaults(Long exceptId, Long ownerId) {
        bankAccountRepository.findByPsychologistIdAndActiveTrue(ownerId).forEach(b -> {
            if (!b.getId().equals(exceptId) && b.isDefault()) {
                b.setDefault(false);
                bankAccountRepository.save(b);
            }
        });
    }

    private BankAccountDto toDto(BankAccount b) {
        return BankAccountDto.builder()
                .id(b.getId())
                .accountName(b.getAccountName())
                .bankName(b.getBankName())
                .accountNumber(b.getAccountNumber())
                .ifscCode(b.getIfscCode())
                .upiId(b.getUpiId())
                .qrCodeBase64(b.getQrCodeBase64())
                .isDefault(b.isDefault())
                .active(b.isActive())
                .build();
    }

    // Public-safe DTO: omits sensitive account details (account number, IFSC, UPI ID)
    private BankAccountDto toPublicDto(BankAccount b) {
        return BankAccountDto.builder()
                .id(b.getId())
                .accountName(b.getAccountName())
                .bankName(b.getBankName())
                .qrCodeBase64(b.getQrCodeBase64())
                .isDefault(b.isDefault())
                .active(b.isActive())
                .build();
    }
}
