package com.patientbook.service;

import com.patientbook.dto.PatientAttachmentDto;
import com.patientbook.entity.Patient;
import com.patientbook.entity.PatientAttachment;
import com.patientbook.repository.PatientAttachmentRepository;
import com.patientbook.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

// File attachments for a patient record (reports, scans, consent forms,
// referral letters, etc). Follows the same convention as the rest of this
// codebase's "uploads" (see SubscriptionService.validateScreenshot,
// BankAccount.qrCodeBase64, settings/page.tsx's compressImageToBase64): the
// frontend reads the file via FileReader.readAsDataURL and posts the
// resulting data URL as JSON — there is no multipart handling anywhere in
// this app, so this doesn't introduce a second upload mechanism.
@Service
@RequiredArgsConstructor
public class PatientAttachmentService {

    private final PatientAttachmentRepository patientAttachmentRepository;
    private final PatientRepository patientRepository;

    private static final int MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB decoded — matches the app's existing photo-upload cap

    // extension -> canonical MIME type stored against the record. The
    // client's declared/browser-reported MIME is deliberately NOT trusted
    // for this (OS/browser MIME sniffing for office documents is
    // inconsistent — e.g. .docx is frequently reported as
    // application/octet-stream) — see sniffFamily() below for the actual
    // content check.
    private static final Map<String, String> EXTENSION_MIME = Map.ofEntries(
            Map.entry("pdf",  "application/pdf"),
            Map.entry("png",  "image/png"),
            Map.entry("jpg",  "image/jpeg"),
            Map.entry("jpeg", "image/jpeg"),
            Map.entry("gif",  "image/gif"),
            Map.entry("webp", "image/webp"),
            Map.entry("doc",  "application/msword"),
            Map.entry("xls",  "application/vnd.ms-excel"),
            Map.entry("ppt",  "application/vnd.ms-powerpoint"),
            Map.entry("docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            Map.entry("xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
            Map.entry("pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
            Map.entry("txt",  "text/plain"),
            Map.entry("csv",  "text/csv")
    );

    // Which magic-byte "family" each extension is expected to sniff as.
    private static final Map<String, String> EXTENSION_FAMILY = Map.ofEntries(
            Map.entry("pdf",  "pdf"),
            Map.entry("png",  "png"),
            Map.entry("jpg",  "jpeg"),
            Map.entry("jpeg", "jpeg"),
            Map.entry("gif",  "gif"),
            Map.entry("webp", "webp"),
            Map.entry("doc",  "ole"),
            Map.entry("xls",  "ole"),
            Map.entry("ppt",  "ole"),
            Map.entry("docx", "zip"),
            Map.entry("xlsx", "zip"),
            Map.entry("pptx", "zip"),
            Map.entry("txt",  "text"),
            Map.entry("csv",  "text")
    );

    @Transactional
    public PatientAttachmentDto uploadAttachment(Long patientId, Long ownerId, String rawFileName, String fileDataValue) {
        Patient patient = patientRepository.findByIdAndPrimaryPsychologistId(patientId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        if (fileDataValue == null || fileDataValue.isBlank()) {
            throw new IllegalArgumentException("No file data provided");
        }

        String sanitizedName = sanitizeFileName(rawFileName);
        String extension = extractExtension(sanitizedName);
        if (extension == null || !EXTENSION_MIME.containsKey(extension)) {
            throw new IllegalArgumentException("Unsupported file type. Allowed: PDF, Word, Excel, PowerPoint, images, and text/CSV files.");
        }

        // Strip an optional "data:mime;base64," prefix — the declared mime
        // in that prefix is ignored for validation (see class comment).
        String payload = fileDataValue;
        int commaIdx = fileDataValue.indexOf(',');
        if (fileDataValue.startsWith("data:") && commaIdx > 0) {
            payload = fileDataValue.substring(commaIdx + 1);
        }

        byte[] decoded;
        try {
            decoded = Base64.getDecoder().decode(payload);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("File data is not valid base64");
        }

        if (decoded.length == 0) {
            throw new IllegalArgumentException("File is empty");
        }
        if (decoded.length > MAX_FILE_BYTES) {
            throw new IllegalArgumentException("File exceeds the 10MB size limit");
        }

        String expectedFamily = EXTENSION_FAMILY.get(extension);
        if (!"text".equals(expectedFamily)) {
            String sniffedFamily = sniffFamily(decoded);
            if (!expectedFamily.equals(sniffedFamily)) {
                throw new IllegalArgumentException("File content doesn't match its extension (." + extension + ")");
            }
        }

        PatientAttachment attachment = PatientAttachment.builder()
                .psychologistId(ownerId)
                .patient(patient)
                .fileName(sanitizedName)
                .fileType(EXTENSION_MIME.get(extension))
                .fileSize((long) decoded.length)
                .fileData(Base64.getEncoder().encodeToString(decoded))
                .build();

        return mapToDto(patientAttachmentRepository.save(attachment));
    }

    @Transactional(readOnly = true)
    public List<PatientAttachmentDto> getAttachments(Long patientId, Long ownerId) {
        // Confirms the patient itself belongs to this owner before touching
        // attachments — otherwise a made-up patientId with zero attachments
        // would silently return an empty list instead of 404.
        patientRepository.findByIdAndPrimaryPsychologistId(patientId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found"));

        return patientAttachmentRepository.findByPatientIdAndPsychologistIdOrderByUploadedAtDesc(patientId, ownerId)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // Returns the full entity (including decoded-ready fileData) for the
    // controller to stream back — internal use only, never serialized as-is.
    @Transactional(readOnly = true)
    public PatientAttachment getAttachmentForDownload(Long patientId, Long attachmentId, Long ownerId) {
        return patientAttachmentRepository.findByIdAndPatientIdAndPsychologistId(attachmentId, patientId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
    }

    @Transactional
    public void deleteAttachment(Long patientId, Long attachmentId, Long ownerId) {
        PatientAttachment attachment = patientAttachmentRepository.findByIdAndPatientIdAndPsychologistId(attachmentId, patientId, ownerId)
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
        patientAttachmentRepository.delete(attachment);
    }

    // ── Helpers ──────────────────────────────────────────────────────────

    private String sanitizeFileName(String rawFileName) {
        if (rawFileName == null) return "attachment";
        // Strip any path components a browser/OS might include, plus
        // control characters — this is stored as-is and later echoed back
        // verbatim in a Content-Disposition header on download.
        String name = rawFileName.replace('\\', '/');
        int lastSlash = name.lastIndexOf('/');
        if (lastSlash >= 0) name = name.substring(lastSlash + 1);
        name = name.replaceAll("[\\p{Cntrl}]", "").trim();
        if (name.length() > 255) name = name.substring(name.length() - 255);
        return name.isEmpty() ? "attachment" : name;
    }

    private String extractExtension(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) return null;
        return fileName.substring(dot + 1).toLowerCase();
    }

    // Magic-byte family sniffing — mirrors SubscriptionService.sniffImageMime
    // but extended to cover the document types this feature accepts.
    private String sniffFamily(byte[] b) {
        if (b.length >= 4 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpeg";
        if (b.length >= 6 && b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8' && (b[4] == '7' || b[4] == '9') && b[5] == 'a') return "gif";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        if (b.length >= 4 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F') return "pdf";
        if (b.length >= 8 && (b[0] & 0xFF) == 0xD0 && (b[1] & 0xFF) == 0xCF && (b[2] & 0xFF) == 0x11 && (b[3] & 0xFF) == 0xE0
                && (b[4] & 0xFF) == 0xA1 && (b[5] & 0xFF) == 0xB1 && (b[6] & 0xFF) == 0x1A && (b[7] & 0xFF) == 0xE1) return "ole";
        if (b.length >= 4 && (b[0] & 0xFF) == 0x50 && (b[1] & 0xFF) == 0x4B
                && ((b[2] & 0xFF) == 0x03 || (b[2] & 0xFF) == 0x05 || (b[2] & 0xFF) == 0x07)) return "zip";
        return null;
    }

    private PatientAttachmentDto mapToDto(PatientAttachment a) {
        return PatientAttachmentDto.builder()
                .id(a.getId())
                .patientId(a.getPatient().getId())
                .fileName(a.getFileName())
                .fileType(a.getFileType())
                .fileSize(a.getFileSize())
                .uploadedAt(a.getUploadedAt())
                .build();
    }
}
