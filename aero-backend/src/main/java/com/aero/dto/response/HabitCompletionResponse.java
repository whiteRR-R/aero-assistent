package com.aero.dto.response;
import java.time.LocalDate;
public record HabitCompletionResponse(Long id, LocalDate completedOn, String note) {}
