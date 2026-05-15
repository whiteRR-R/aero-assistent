package com.aero.dto.response;
import java.time.Instant;
public record UserResponse(
    Long id,
    String email,
    String fullName,
    String avatarUrl,
    String bio,
    String timezone,
    String locale,
    String provider,
    Instant createdAt
) {}
