package com.aero.dto.response;

import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import java.time.Instant;
import java.util.Set;

public record TaskResponse(
    Long id,
    String title,
    String description,
    TaskStatus status,
    TaskPriority priority,
    Instant deadline,
    String imageUrl,
    Set<String> tags,
    Instant completedAt,
    Instant createdAt,
    Instant updatedAt
) {}
