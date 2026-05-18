package com.aero.dto.response;

public record QuickCaptureResponse(
    String action,
    String summary,
    Object created
) {}
