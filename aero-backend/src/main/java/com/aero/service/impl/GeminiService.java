package com.aero.service.impl;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.BiFunction;

@Service
@Slf4j
@RequiredArgsConstructor
public class GeminiService {

    private final RestClient restClient;

    @Value("${aero.ai.groq.api-key:}")
    private String groqApiKey;

    @Value("${aero.ai.groq.base-url:https://api.groq.com/openai/v1}")
    private String groqBaseUrl;

    @Value("${aero.ai.groq.model:llama-3.1-8b-instant}")
    private String groqModel;

    private static final String SYSTEM_PROMPT = """
        You are AERO, a personal productivity AI assistant embedded in the AERO app.
        Always reply in the same language as the user (Russian, English, Kazakh) unless asked otherwise.
        Be concise and practical.
        """;

    public String chat(List<Map<String, Object>> history,
                       BiFunction<String, Map<String, Object>, Object> executor) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return "AI is not configured. Please set GROQ_API_KEY.";
        }

        try {
            List<ChatMessage> messages = toMessages(history, true);
            ChatCompletionRequest req = new ChatCompletionRequest(
                    groqModel,
                    messages,
                    0.6,
                    900,
                    null,
                    null
            );

            ChatCompletionResponse resp = callGroq(req);
            if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
                return "Sorry, I couldn't generate a response. Please try again.";
            }

            Choice firstChoice = resp.choices().get(0);
            AssistantMessage firstMsg = firstChoice.message();
            String text = firstMsg != null ? firstMsg.content() : null;
            return normalize(text, "Sorry, I couldn't generate a response. Please try again.");
        } catch (Exception e) {
            log.error("Groq chat error", e);
            return "Sorry, an error occurred while contacting AI.";
        }
    }

    public String generateText(String systemInstruction, String userPrompt) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return "AI_ERROR";
        }
        try {
            String sys = (systemInstruction == null || systemInstruction.isBlank()) ? SYSTEM_PROMPT : systemInstruction;
            List<ChatMessage> msgs = List.of(
                    new ChatMessage("system", sys, null, null, null),
                    new ChatMessage("user", userPrompt, null, null, null)
            );
            ChatCompletionRequest req = new ChatCompletionRequest(
                    groqModel,
                    msgs,
                    0.65,
                    900,
                    null,
                    null
            );
            ChatCompletionResponse resp = callGroq(req);
            if (resp == null || resp.choices() == null || resp.choices().isEmpty()) {
                return "Could not generate content.";
            }
            String text = resp.choices().get(0).message() != null
                    ? resp.choices().get(0).message().content()
                    : null;
            return normalize(text, "Could not generate content.");
        } catch (Exception e) {
            log.error("Groq generateText error", e);
            return "AI_ERROR";
        }
    }

    private ChatCompletionResponse callGroq(ChatCompletionRequest req) {
        String url = trimSlash(groqBaseUrl) + "/chat/completions";
        return restClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + groqApiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(req)
                .retrieve()
                .body(ChatCompletionResponse.class);
    }

    @SuppressWarnings("unchecked")
    private List<ChatMessage> toMessages(List<Map<String, Object>> history, boolean withSystem) {
        List<ChatMessage> out = new ArrayList<>();
        if (withSystem) out.add(new ChatMessage("system", SYSTEM_PROMPT, null, null, null));
        for (Map<String, Object> h : history) {
            String roleRaw = String.valueOf(h.getOrDefault("role", "user")).toLowerCase(Locale.ROOT);
            String role = "model".equals(roleRaw) ? "assistant" : roleRaw;
            Object partsObj = h.get("parts");
            if (!(partsObj instanceof List<?> parts)) continue;
            StringBuilder text = new StringBuilder();
            for (Object p : parts) {
                if (p instanceof Map<?, ?> m) {
                    Object v = ((Map<String, Object>) m).get("text");
                    if (v != null) text.append(v).append('\n');
                }
            }
            String content = text.toString().trim();
            if (!content.isBlank()) out.add(new ChatMessage(role, content, null, null, null));
        }
        return out;
    }

    private List<ToolSpec> toolDeclarations() {
        return List.of(
                ToolSpec.function(new FunctionSpec("create_task", "Create a new task.",
                        ToolJsonSchema.of(Map.of(
                                "title", Map.of("type", "string"),
                                "description", Map.of("type", "string"),
                                "priority", Map.of("type", "string", "enum", List.of("LOW", "MEDIUM", "HIGH", "URGENT")),
                                "deadline", Map.of("type", "string")
                        ), List.of("title")))),
                ToolSpec.function(new FunctionSpec("list_tasks", "List tasks.",
                        ToolJsonSchema.of(Map.of(
                                "status", Map.of("type", "string", "enum", List.of("TODO", "IN_PROGRESS", "DONE", "CANCELLED")),
                                "limit", Map.of("type", "integer")
                        ), List.of()))),
                ToolSpec.function(new FunctionSpec("get_task_stats", "Get task stats.",
                        ToolJsonSchema.of(Map.of(), List.of()))),
                ToolSpec.function(new FunctionSpec("create_habit", "Create a habit.",
                        ToolJsonSchema.of(Map.of(
                                "name", Map.of("type", "string"),
                                "description", Map.of("type", "string"),
                                "frequency", Map.of("type", "string", "enum", List.of("DAILY", "WEEKLY", "CUSTOM")),
                                "targetPerWeek", Map.of("type", "integer")
                        ), List.of("name")))),
                ToolSpec.function(new FunctionSpec("list_habits", "List habits.",
                        ToolJsonSchema.of(Map.of(), List.of()))),
                ToolSpec.function(new FunctionSpec("list_upcoming_events", "List upcoming events.",
                        ToolJsonSchema.of(Map.of(
                                "days", Map.of("type", "integer")
                        ), List.of())))
        );
    }

    private String trimSlash(String s) {
        if (s == null || s.isBlank()) return "https://api.groq.com/openai/v1";
        return s.endsWith("/") ? s.substring(0, s.length() - 1) : s;
    }

    private String normalize(String text, String fallback) {
        if (text == null) return fallback;
        String t = text.trim();
        return t.isBlank() ? fallback : t;
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ChatCompletionRequest(
            String model,
            List<ChatMessage> messages,
            Double temperature,
            @JsonProperty("max_tokens") Integer maxTokens,
            List<ToolSpec> tools,
            @JsonProperty("tool_choice") String toolChoice
    ) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record ChatMessage(
            String role,
            String content,
            @JsonProperty("tool_calls") List<ToolCall> toolCalls,
            @JsonProperty("tool_call_id") String toolCallId,
            String name
    ) {}

    record ChatCompletionResponse(List<Choice> choices) {}
    record Choice(Integer index, AssistantMessage message) {}

    @JsonInclude(JsonInclude.Include.NON_NULL)
    record AssistantMessage(
            String role,
            String content,
            @JsonProperty("tool_calls") List<ToolCall> toolCalls
    ) {}

    record ToolCall(String id, String type, FunctionCall function) {}
    record FunctionCall(String name, String arguments) {}

    record ToolSpec(String type, FunctionSpec function) {
        static ToolSpec function(FunctionSpec fn) { return new ToolSpec("function", fn); }
    }

    record FunctionSpec(String name, String description, ToolJsonSchema parameters) {}

    record ToolJsonSchema(String type, Map<String, Object> properties, List<String> required) {
        static ToolJsonSchema of(Map<String, Object> properties, List<String> required) {
            return new ToolJsonSchema("object", properties, required);
        }
    }

    @RequiredArgsConstructor
    static class Jsons {
        private static final com.fasterxml.jackson.databind.ObjectMapper M = new com.fasterxml.jackson.databind.ObjectMapper();
        static Map<String, Object> parseMap(String json) {
            try {
                if (json == null || json.isBlank()) return Map.of();
                return M.readValue(json, Map.class);
            } catch (Exception e) {
                return Map.of();
            }
        }
        static String stringify(Object v) {
            try { return M.writeValueAsString(v); }
            catch (Exception e) { return "{}"; }
        }
    }
}
