package com.aero.dto.response;

import com.aero.enums.ReminderRefType;
import com.aero.enums.ReminderStatus;
import java.time.Instant;

public record ReminderResponse(
    Long id,
    String title,
    String message,
    ReminderRefType refType,
    Long refId,
    Instant remindAt,
    ReminderStatus status,
    Instant sentAt,
    Instant createdAt
) {}
