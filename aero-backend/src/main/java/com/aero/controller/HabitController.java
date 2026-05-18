package com.aero.controller;

import com.aero.dto.request.HabitCheckRequest;
import com.aero.dto.request.HabitRequest;
import com.aero.dto.response.HabitCompletionResponse;
import com.aero.dto.response.HabitResponse;
import com.aero.dto.response.HabitStatsResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.HabitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/habits")
@RequiredArgsConstructor
@Tag(name = "Habits", description = "Habit tracker with daily check-ins, streaks, and statistics")
public class HabitController {

    private final HabitService habitService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new habit")
    public HabitResponse create(@Valid @RequestBody HabitRequest req) {
        return habitService.create(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get habit by ID (includes current streak)")
    public HabitResponse getById(@PathVariable Long id) {
        return habitService.getById(SecurityUtil.currentUserId(), id);
    }

    @GetMapping
    @Operation(summary = "List habits (active only by default)")
    public List<HabitResponse> list(
            @RequestParam(defaultValue = "true") boolean activeOnly) {
        return habitService.list(SecurityUtil.currentUserId(), activeOnly);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a habit")
    public HabitResponse update(@PathVariable Long id,
                                @Valid @RequestBody HabitRequest req) {
        return habitService.update(SecurityUtil.currentUserId(), id, req);
    }

    @PostMapping("/{id}/archive")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Archive (soft-delete) a habit — keeps all history")
    public void archive(@PathVariable Long id) {
        habitService.archive(SecurityUtil.currentUserId(), id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Permanently delete a habit and all its completions")
    public void delete(@PathVariable Long id) {
        habitService.delete(SecurityUtil.currentUserId(), id);
    }



    @PostMapping("/{id}/check")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Mark habit as completed for a specific date")
    public HabitCompletionResponse checkIn(@PathVariable Long id,
                                           @Valid @RequestBody HabitCheckRequest req) {
        return habitService.checkIn(SecurityUtil.currentUserId(), id, req);
    }

    @DeleteMapping("/{id}/check")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Remove completion mark for a specific date")
    public void uncheck(
            @PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        habitService.uncheck(SecurityUtil.currentUserId(), id, date);
    }



    @GetMapping("/{id}/stats")
    @Operation(summary = "Get streak, completion rate and monthly breakdown")
    public HabitStatsResponse stats(@PathVariable Long id) {
        return habitService.getStats(SecurityUtil.currentUserId(), id);
    }
}
