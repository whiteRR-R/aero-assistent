package com.aero.dto.response;
import java.time.Instant;
public record ProfileHistoryResponse(
    Long id, String fieldName, String oldValue, String newValue, Instant changedAt
) {}
