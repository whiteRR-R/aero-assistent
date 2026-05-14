package com.aero.dto.response;

import java.time.Instant;
import java.util.List;

public record AiMessageResponse(
    long   conversationId,
    String conversationTitle,
    long   messageId,
    String content,
    String role,
    List<ToolCallInfo> toolCalls,
    Instant createdAt
) {
    public record ToolCallInfo(String tool, String summary) {}
}
