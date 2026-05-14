package com.aero.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record QuickCaptureRequest(
    @NotBlank @Size(max = 1000) String text
) {}
