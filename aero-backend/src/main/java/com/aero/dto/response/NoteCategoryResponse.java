package com.aero.dto.response;
import java.time.Instant;
public record NoteCategoryResponse(Long id, String name, String color, Instant createdAt) {}
