package com.patientbook.controller;

import com.patientbook.dto.BankAccountDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.BankAccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// The public "active bank accounts for the payment page" read moved to
// PublicController (/api/v1/public/{slug}/bank-accounts) — there is no
// longer a single global set of accounts to read without a slug.
@RestController
@RequestMapping("/api/v1/bank-accounts")
@RequiredArgsConstructor
public class BankAccountController {

    private final BankAccountService bankAccountService;
    private final CurrentUserProvider currentUserProvider;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BankAccountDto>> getAllBankAccounts() {
        return ResponseEntity.ok(bankAccountService.getAllBankAccounts(currentUserProvider.getCurrentUserId()));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BankAccountDto> createBankAccount(@RequestBody BankAccountDto dto) {
        return ResponseEntity.ok(bankAccountService.createBankAccount(dto, currentUserProvider.getCurrentUserId()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BankAccountDto> updateBankAccount(
            @PathVariable Long id,
            @RequestBody BankAccountDto dto) {
        return ResponseEntity.ok(bankAccountService.updateBankAccount(id, currentUserProvider.getCurrentUserId(), dto));
    }

    @PatchMapping("/{id}/set-default")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BankAccountDto> setDefault(@PathVariable Long id) {
        return ResponseEntity.ok(bankAccountService.setDefault(id, currentUserProvider.getCurrentUserId()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteBankAccount(@PathVariable Long id) {
        bankAccountService.deleteBankAccount(id, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
