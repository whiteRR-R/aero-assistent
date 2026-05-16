package com.aero.controller;

import com.aero.dto.request.EventRequest;
import com.aero.dto.response.EventResponse;
import com.aero.dto.response.PageResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.EventService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
@Tag(name = "Events", description = "Calendar events with location, recurrence, and image support")
public class EventController {

    private final EventService eventService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new event")
    public EventResponse create(@Valid @RequestBody EventRequest req) {
        return eventService.create(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get event by ID")
    public EventResponse getById(@PathVariable Long id) {
        return eventService.getById(SecurityUtil.currentUserId(), id);
    }

    @GetMapping
    @Operation(summary = "List all events (paginated)")
    public PageResponse<EventResponse> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return eventService.list(SecurityUtil.currentUserId(), page, size);
    }

    @GetMapping("/calendar")
    @Operation(summary = "Get events in a date range (calendar view)")
    public List<EventResponse> calendar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to) {
        return eventService.getByDateRange(SecurityUtil.currentUserId(), from, to);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace an event")
    public EventResponse update(@PathVariable Long id,
                                @Valid @RequestBody EventRequest req) {
        return eventService.update(SecurityUtil.currentUserId(), id, req);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Attach or replace the event image")
    public EventResponse uploadImage(@PathVariable Long id,
                                     @RequestParam("file") MultipartFile file) {
        return eventService.uploadImage(SecurityUtil.currentUserId(), id, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an event")
    public void delete(@PathVariable Long id) {
        eventService.delete(SecurityUtil.currentUserId(), id);
    }
}
