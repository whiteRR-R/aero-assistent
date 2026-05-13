package com.aero.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
public record EventRequest(
    @NotBlank @Size(max=500) String title,
    String description,
    @Size(max=500) String location,
    @NotNull Instant startTime,
    Instant endTime,
    Boolean allDay,
    String color,
    String recurrence
) {}
