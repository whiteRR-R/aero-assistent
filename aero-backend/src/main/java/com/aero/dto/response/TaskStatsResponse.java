package com.aero.dto.response;

public record TaskStatsResponse(
    long total, long todo, long inProgress, long done, long cancelled, long overdue
) {}
