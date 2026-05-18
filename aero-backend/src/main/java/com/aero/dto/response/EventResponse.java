package com.aero.dto.response;

import java.time.Instant;

public record EventResponse(
    Long id,
    String title,
    String description,
    String location,
    Instant startTime,
    Instant endTime,
    Boolean allDay,
    String imageUrl,
    String color,
    String recurrence,
    String externalId,
    Instant createdAt,
    Instant updatedAt
) {}
