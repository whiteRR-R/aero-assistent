package com.aero.dto.response;
import com.aero.enums.HabitFrequency;
import java.time.Instant;
public record HabitResponse(
    Long id,
    String name,
    String description,
    HabitFrequency frequency,
    Integer targetPerWeek,
    String color,
    String icon,
    Boolean active,
    int currentStreak,
    int longestStreak,
    long totalCompletions,
    Instant createdAt
) {}
