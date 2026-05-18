package com.aero.controller;

import com.aero.security.SecurityUtil;
import com.aero.service.impl.CalendarService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/calendar")
@RequiredArgsConstructor
@Tag(name = "Calendar", description = "iCal export and Google Calendar integration")
public class CalendarController {

    private final CalendarService calendarService;



    @GetMapping(value = "/export.ics", produces = "text/calendar")
    @Operation(summary = "Export all events as iCal (.ics) — importable into any calendar app")
    public ResponseEntity<byte[]> exportIcal() {
        byte[] ical = calendarService.exportIcal(SecurityUtil.currentUserId());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"aero-calendar.ics\"")
                .contentType(MediaType.parseMediaType("text/calendar; charset=UTF-8"))
                .body(ical);
    }



    @GetMapping("/google/status")
    @Operation(summary = "Check whether Google Calendar is connected")
    public Map<String, Boolean> googleStatus() {
        return Map.of("connected",
                calendarService.isGoogleConnected(SecurityUtil.currentUserId()));
    }

    @PostMapping("/google/connect")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Save Google Calendar OAuth tokens after consent flow")
    public void connectGoogle(
            @RequestParam String accessToken,
            @RequestParam(required = false) String refreshToken,
            @RequestParam(required = false) Long expiresAt,
            @RequestParam(defaultValue = "primary") String calendarId) {

        Instant tokenExpires = expiresAt != null
                ? Instant.ofEpochMilli(expiresAt)
                : null;

        calendarService.connectGoogleCalendar(
                SecurityUtil.currentUserId(),
                accessToken, refreshToken,
                tokenExpires, calendarId);
    }

    @PostMapping("/google/sync")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Trigger async sync from Google Calendar (202 Accepted)")
    public Map<String, String> syncGoogle() {
        calendarService.syncFromGoogle(SecurityUtil.currentUserId());
        return Map.of("status", "sync_started");
    }

    @DeleteMapping("/google")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Disconnect Google Calendar integration")
    public void disconnectGoogle() {
        calendarService.disconnectGoogleCalendar(SecurityUtil.currentUserId());
    }
}
