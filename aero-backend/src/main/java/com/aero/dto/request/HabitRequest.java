package com.aero.dto.request;
import com.aero.enums.HabitFrequency;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record HabitRequest(
    @NotBlank @Size(max=255) String name,
    String description,
    HabitFrequency frequency,
    @Min(1) @Max(7) Integer targetPerWeek,
    @Size(max=20) String color,
    @Size(max=50) String icon
) {}
