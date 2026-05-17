package com.aero.controller;

import com.aero.dto.request.TaskRequest;
import com.aero.dto.response.PageResponse;
import com.aero.dto.response.TaskResponse;
import com.aero.dto.response.TaskStatsResponse;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.TaskService;
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
@RequestMapping("/tasks")
@RequiredArgsConstructor
@Tag(name = "Tasks", description = "Task management with priorities, deadlines and image attachments")
public class TaskController {

    private final TaskService taskService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a new task")
    public TaskResponse create(@Valid @RequestBody TaskRequest req) {
        return taskService.create(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get task by ID")
    public TaskResponse getById(@PathVariable Long id) {
        return taskService.getById(SecurityUtil.currentUserId(), id);
    }

    @GetMapping
    @Operation(summary = "List tasks with optional filtering and pagination")
    public PageResponse<TaskResponse> list(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "createdAt_desc") String sort
    ) {
        return taskService.list(SecurityUtil.currentUserId(),
                status, priority, from, to, page, size, sort);
    }

    @GetMapping("/upcoming")
    @Operation(summary = "Get upcoming tasks (next N days, default 7)")
    public List<TaskResponse> upcoming(
            @RequestParam(defaultValue = "7") int days) {
        return taskService.upcoming(SecurityUtil.currentUserId(), days);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Replace a task")
    public TaskResponse update(@PathVariable Long id,
                               @Valid @RequestBody TaskRequest req) {
        return taskService.update(SecurityUtil.currentUserId(), id, req);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Attach or replace the task image")
    public TaskResponse uploadImage(@PathVariable Long id,
                                    @RequestParam("file") MultipartFile file) {
        return taskService.uploadImage(SecurityUtil.currentUserId(), id, file);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a task")
    public void delete(@PathVariable Long id) {
        taskService.delete(SecurityUtil.currentUserId(), id);
    }

    @GetMapping("/stats")
    @Operation(summary = "Get task statistics (counts by status, overdue)")
    public TaskStatsResponse stats() {
        return taskService.stats(SecurityUtil.currentUserId());
    }
}
