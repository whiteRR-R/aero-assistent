package com.aero.controller;

import com.aero.dto.request.NotificationPrefRequest;
import com.aero.dto.request.ReminderRequest;
import com.aero.dto.response.NotificationPrefResponse;
import com.aero.dto.response.PageResponse;
import com.aero.dto.response.ReminderResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.ReminderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/reminders")
@RequiredArgsConstructor
@Tag(name = "Reminders & Notifications", description = "Time-based reminders and notification preferences")
public class ReminderController {

    private final ReminderService reminderService;



    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a reminder")
    public ReminderResponse create(@Valid @RequestBody ReminderRequest req) {
        return reminderService.create(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get reminder by ID")
    public ReminderResponse getById(@PathVariable Long id) {
        return reminderService.getById(SecurityUtil.currentUserId(), id);
    }

    @GetMapping
    @Operation(summary = "List all reminders (paginated, ordered by remindAt ASC)")
    public PageResponse<ReminderResponse> list(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return reminderService.list(SecurityUtil.currentUserId(), page, size);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a reminder (also re-arms it to PENDING)")
    public ReminderResponse update(@PathVariable Long id,
                                   @Valid @RequestBody ReminderRequest req) {
        return reminderService.update(SecurityUtil.currentUserId(), id, req);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Cancel a reminder without deleting it")
    public void cancel(@PathVariable Long id) {
        reminderService.cancel(SecurityUtil.currentUserId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a reminder permanently")
    public void delete(@PathVariable Long id) {
        reminderService.delete(SecurityUtil.currentUserId(), id);
    }



    @GetMapping("/preferences")
    @Operation(summary = "Get notification preferences")
    public NotificationPrefResponse getPreferences() {
        return reminderService.getPreferences(SecurityUtil.currentUserId());
    }

    @PatchMapping("/preferences")
    @Operation(summary = "Update notification preferences (partial update)")
    public NotificationPrefResponse updatePreferences(
            @Valid @RequestBody NotificationPrefRequest req) {
        return reminderService.updatePreferences(SecurityUtil.currentUserId(), req);
    }
}
