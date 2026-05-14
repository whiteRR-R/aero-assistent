package com.aero.dto.response;

import java.time.Instant;
import java.util.List;

public record ConversationResponse(
    long    id,
    String  title,
    Instant createdAt,
    Instant updatedAt,
    List<MessageItem> messages
) {
    public record MessageItem(
        long    id,
        String  role,
        String  content,
        List<AiMessageResponse.ToolCallInfo> toolCalls,
        Instant createdAt
    ) {}
}
