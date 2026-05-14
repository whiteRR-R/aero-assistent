package com.aero.dto.request;
import com.aero.enums.ReminderRefType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
public record ReminderRequest(
    @NotBlank String title,
    String message,
    @NotNull ReminderRefType refType,
    Long refId,
    @NotNull @Future Instant remindAt
) {}
