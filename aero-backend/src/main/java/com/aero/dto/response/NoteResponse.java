package com.aero.dto.response;

import java.time.Instant;
import java.util.Set;

public record NoteResponse(
    Long id,
    String title,
    String content,
    NoteCategoryResponse category,
    Boolean pinned,
    Set<String> tags,
    Instant createdAt,
    Instant updatedAt
) {}
