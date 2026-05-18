package com.aero.dto.response;

import java.time.LocalDate;
import java.util.List;

public record HabitStatsResponse(
    Long habitId,
    String habitName,
    int currentStreak,
    int longestStreak,
    long totalCompletions,
    double completionRateThisWeek,
    double completionRateThisMonth,
    List<LocalDate> completedDatesThisMonth,
    boolean checkedToday
) {}
