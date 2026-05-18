package com.aero.dto.request;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
    @Size(max=255) String fullName,
    @Size(max=1000) String bio,
    @Size(max=100) String timezone,
    @Size(max=10) String locale
) {}
