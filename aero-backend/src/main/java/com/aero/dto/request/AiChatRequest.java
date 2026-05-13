package com.aero.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiChatRequest(
    @NotBlank @Size(max = 4000) String message,
    Long conversationId   
) {}
