package com.aero.dto.response;

import java.time.Instant;

public record WeeklyReviewResponse(
    String  review,
    Instant generatedAt,
    Stats   stats
) {
    public record Stats(
        long   tasksCompleted,
        long   tasksCreated,
        double completionRate,
        long   habitsCheckedIn,
        String mostProductiveDay,   
        double vsLastWeekPct        
    ) {}
}
