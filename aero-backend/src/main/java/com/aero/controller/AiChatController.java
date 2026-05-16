package com.aero.controller;

import com.aero.dto.request.AiChatRequest;
import com.aero.dto.response.AiMessageResponse;
import com.aero.dto.response.ConversationResponse;
import com.aero.dto.response.PageResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.AiChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/ai/chat")
@RequiredArgsConstructor
@Tag(name = "AI Chat", description = "Gemini-powered productivity assistant")
public class AiChatController {

    private final AiChatService aiChatService;

    @PostMapping("/message")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Send a message to the AI assistant")
    public AiMessageResponse sendMessage(@Valid @RequestBody AiChatRequest req) {
        return aiChatService.sendMessage(SecurityUtil.currentUserId(), req);
    }

    @GetMapping("/conversations")
    @Operation(summary = "List all conversations for the current user")
    public PageResponse<ConversationResponse> listConversations(
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return PageResponse.of(aiChatService.listConversations(SecurityUtil.currentUserId(), page, size));
    }

    @GetMapping("/conversations/{id}")
    @Operation(summary = "Get a conversation with all its messages")
    public ConversationResponse getConversation(@PathVariable Long id) {
        return aiChatService.getConversation(SecurityUtil.currentUserId(), id);
    }

    @DeleteMapping("/conversations/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a conversation")
    public void deleteConversation(@PathVariable Long id) {
        aiChatService.deleteConversation(SecurityUtil.currentUserId(), id);
    }
}
