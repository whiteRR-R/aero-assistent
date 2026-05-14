package com.aero.dto.request;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Set;
public record TaskRequest(
    @NotBlank @Size(max=500) String title,
    String description,
    TaskStatus status,
    TaskPriority priority,
    Instant deadline,
    Set<String> tags
) {}
