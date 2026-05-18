package com.aero.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record NoteRequest(
    @NotBlank @Size(max=500) String title,
    String content,
    Long categoryId,
    Boolean pinned,
    Set<String> tags
) {}
