package com.aero.dto.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record HabitCheckRequest(
    @NotNull LocalDate date,
    String note
) {}
