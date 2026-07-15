package com.patientbook.controller;

import com.patientbook.dto.MoodLogDto;
import com.patientbook.security.CurrentUserProvider;
import com.patientbook.service.MoodLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/mood")
@RequiredArgsConstructor
public class MoodController {

    private final MoodLogService moodLogService;
    private final CurrentUserProvider currentUserProvider;

    // POST /api/v1/mood — Patient submits mood (PUBLIC — no auth needed)
    @PostMapping
    public ResponseEntity<MoodLogDto> submitMood(@RequestBody Map<String, Object> body) {
        String token   = body.get("trackingToken").toString();
        Integer score  = Integer.valueOf(body.get("moodScore").toString());
        String note    = body.containsKey("note") ? body.get("note").toString() : null;
        return ResponseEntity.ok(moodLogService.submitMoodLog(token, score, note));
    }

    // GET /api/v1/mood/patient/{id} — Mood trend for doctor dashboard
    @GetMapping("/patient/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<MoodLogDto>> getMoodByPatient(@PathVariable Long id) {
        return ResponseEntity.ok(moodLogService.getMoodLogsByPatient(id, currentUserProvider.getCurrentUserId()));
    }

    // GET /api/v1/mood/appointment/{id}
    @GetMapping("/appointment/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getMoodByAppointment(@PathVariable Long id) {
        return moodLogService.getMoodLogByAppointment(id, currentUserProvider.getCurrentUserId())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }
}
