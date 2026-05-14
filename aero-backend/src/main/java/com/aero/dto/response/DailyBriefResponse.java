package com.aero.dto.response;

import java.time.Instant;

public record DailyBriefResponse(
    String  brief,
    Instant generatedAt,
    Stats   stats
) {
    public record Stats(
        long   tasksDueToday,
        long   overdueCount,
        long   habitsAtRisk,
        long   eventsToday,
        double yesterdayCompletionPct
    ) {}
}
