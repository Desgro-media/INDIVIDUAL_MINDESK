package com.patientbook.controller;

import com.patientbook.dto.SessionNoteDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.SessionNoteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notes")
@RequiredArgsConstructor
public class SessionNoteController {

    private final SessionNoteService sessionNoteService;
    private final CurrentUserProvider currentUserProvider;

    // POST /api/v1/notes — Create or update a SOAP note for an appointment
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<SessionNoteDto> saveNote(@RequestBody Map<String, Object> body) {
        Long appointmentId = Long.valueOf(body.get("appointmentId").toString());
        return ResponseEntity.ok(sessionNoteService.saveNote(appointmentId, currentUserProvider.getCurrentUserId(), body));
    }

    // GET /api/v1/notes/appointment/{id}
    @GetMapping("/appointment/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getNoteByAppointment(@PathVariable Long id) {
        return sessionNoteService.getNoteByAppointment(id, currentUserProvider.getCurrentUserId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    // GET /api/v1/notes/patient/{id}
    @GetMapping("/patient/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<SessionNoteDto>> getNotesByPatient(@PathVariable Long id) {
        return ResponseEntity.ok(sessionNoteService.getNotesByPatient(id, currentUserProvider.getCurrentUserId()));
    }

    // DELETE /api/v1/notes/{id}
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNote(@PathVariable Long id) {
        sessionNoteService.deleteNote(id, currentUserProvider.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}
