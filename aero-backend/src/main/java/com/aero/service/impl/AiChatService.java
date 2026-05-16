package com.aero.service.impl;

import com.aero.dto.request.AiChatRequest;
import com.aero.dto.request.HabitRequest;
import com.aero.dto.request.TaskRequest;
import com.aero.dto.response.AiMessageResponse;
import com.aero.dto.response.AiMessageResponse.ToolCallInfo;
import com.aero.dto.response.ConversationResponse;
import com.aero.dto.response.ConversationResponse.MessageItem;
import com.aero.entity.ChatConversation;
import com.aero.entity.ChatMessage;
import com.aero.entity.User;
import com.aero.enums.MessageRole;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import com.aero.exception.NotFoundException;
import com.aero.repository.ChatConversationRepository;
import com.aero.repository.ChatMessageRepository;
import com.aero.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiChatService {

    private final GeminiService          gemini;
    private final TaskService            taskService;
    private final HabitService           habitService;
    private final EventService           eventService;
    private final ChatConversationRepository convRepo;
    private final ChatMessageRepository  msgRepo;
    private final UserRepository         userRepo;
    private final ObjectMapper           objectMapper;

    private static final int MAX_HISTORY_MESSAGES = 20;

    

    @Transactional
    public AiMessageResponse sendMessage(Long userId, AiChatRequest req) {

        
        ChatConversation conv;
        if (req.conversationId() != null) {
            conv = convRepo.findByIdAndUserId(req.conversationId(), userId)
                    .orElseThrow(() -> NotFoundException.of("Conversation", req.conversationId()));
            AiMessageResponse duplicate = tryReturnRecentDuplicate(conv.getId(), req.message());
            if (duplicate != null) {
                return duplicate;
            }
        } else {
            conv = convRepo.save(ChatConversation.builder()
                    .user(User.builder().id(userId).build())
                    .title(truncate(req.message(), 60))
                    .build());
        }

        
        ChatMessage userMsg = msgRepo.save(ChatMessage.builder()
                .conversation(conv)
                .role(MessageRole.USER)
                .content(req.message())
                .build());

        
        List<ChatMessage> history = getHistory(conv.getId());
        String userLocale = userRepo.findById(userId).map(User::getLocale).orElse("en");
        List<Map<String, Object>> geminiHistory = buildGeminiHistory(history, userLocale, userId);

        
        List<ToolCallInfo> toolCallInfos = new ArrayList<>();

        
        String aiText = gemini.chat(geminiHistory, (toolName, args) -> {
            Object result = executeTool(toolName, args, userId);
            toolCallInfos.add(new ToolCallInfo(toolName, summarizeTool(toolName, args, result)));
            log.info("AI tool executed: {} → {}", toolName, result);
            return result;
        });

        
        String toolCallsJson = toolCallInfos.isEmpty() ? null : toJson(toolCallInfos);
        ChatMessage aiMsg = msgRepo.save(ChatMessage.builder()
                .conversation(conv)
                .role(MessageRole.ASSISTANT)
                .content(aiText)
                .toolCalls(toolCallsJson)
                .build());

        
        if (conv.getTitle() == null || conv.getTitle().isBlank()) {
            conv.setTitle(truncate(req.message(), 60));
            convRepo.save(conv);
        }

        return new AiMessageResponse(
                conv.getId(),
                conv.getTitle(),
                aiMsg.getId(),
                aiMsg.getContent(),
                aiMsg.getRole().name(),
                toolCallInfos,
                aiMsg.getCreatedAt()
        );
    }

    

    @Transactional(readOnly = true)
    public Page<ConversationResponse> listConversations(Long userId, int page, int size) {
        return convRepo.findByUserId(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "updatedAt")))
                .map(c -> new ConversationResponse(c.getId(), c.getTitle(),
                        c.getCreatedAt(), c.getUpdatedAt(), List.of()));
    }

    

    @Transactional(readOnly = true)
    public ConversationResponse getConversation(Long userId, Long convId) {
        ChatConversation conv = convRepo.findByIdAndUserId(convId, userId)
                .orElseThrow(() -> NotFoundException.of("Conversation", convId));

        List<MessageItem> items = msgRepo
                .findByConversationIdOrderByCreatedAtAsc(convId)
                .stream()
                .map(m -> new MessageItem(
                        m.getId(),
                        m.getRole().name(),
                        m.getContent(),
                        parseToolCalls(m.getToolCalls()),
                        m.getCreatedAt()))
                .toList();

        return new ConversationResponse(conv.getId(), conv.getTitle(),
                conv.getCreatedAt(), conv.getUpdatedAt(), items);
    }

    

    @Transactional
    public void deleteConversation(Long userId, Long convId) {
        ChatConversation conv = convRepo.findByIdAndUserId(convId, userId)
                .orElseThrow(() -> NotFoundException.of("Conversation", convId));
        convRepo.delete(conv);
    }

    
    
    

    private Object executeTool(String tool, Map<String, Object> args, Long userId) {
        try {
            return switch (tool) {
                case "create_task"          -> execCreateTask(args, userId);
                case "list_tasks"           -> execListTasks(args, userId);
                case "get_task_stats"       -> taskService.stats(userId);
                case "create_habit"         -> execCreateHabit(args, userId);
                case "list_habits"          -> habitService.list(userId, true);
                case "list_upcoming_events" -> execListEvents(args, userId);
                default -> Map.of("error", "Unknown tool: " + tool);
            };
        } catch (Exception e) {
            log.error("Tool execution failed: {}", tool, e);
            return Map.of("error", e.getMessage());
        }
    }

    private Object execCreateTask(Map<String, Object> args, Long userId) {
        String title       = str(args, "title");
        String description = str(args, "description");
        String priorityStr = str(args, "priority");
        String deadlineStr = str(args, "deadline");

        TaskPriority priority = priorityStr != null
                ? TaskPriority.valueOf(priorityStr.toUpperCase()) : TaskPriority.MEDIUM;

        Instant deadline = null;
        if (deadlineStr != null && !deadlineStr.isBlank()) {
            try { deadline = Instant.parse(deadlineStr); } catch (Exception ignored) {}
        }

        TaskRequest req = new TaskRequest(title, description,
                TaskStatus.TODO, priority, deadline, Set.of());
        return taskService.create(userId, req);
    }

    private Object execListTasks(Map<String, Object> args, Long userId) {
        TaskStatus status = null;
        String statusStr = str(args, "status");
        if (statusStr != null) {
            try { status = TaskStatus.valueOf(statusStr.toUpperCase()); } catch (Exception ignored) {}
        }
        int limit = args.containsKey("limit")
                ? ((Number) args.get("limit")).intValue() : 10;

        return taskService.list(userId, status, null, null, null, 0, limit, "createdAt_desc");
    }

    private Object execCreateHabit(Map<String, Object> args, Long userId) {
        String name        = str(args, "name");
        String description = str(args, "description");
        String freqStr     = str(args, "frequency");
        Number tpw         = args.containsKey("targetPerWeek")
                ? (Number) args.get("targetPerWeek") : null;

        com.aero.enums.HabitFrequency freq = com.aero.enums.HabitFrequency.DAILY;
        if (freqStr != null) {
            try { freq = com.aero.enums.HabitFrequency.valueOf(freqStr.toUpperCase()); }
            catch (Exception ignored) {}
        }

        HabitRequest req = new HabitRequest(name, description, freq,
                tpw != null ? tpw.intValue() : 7, null, null);
        return habitService.create(userId, req);
    }

    private Object execListEvents(Map<String, Object> args, Long userId) {
        int days = args.containsKey("days") ? ((Number) args.get("days")).intValue() : 7;
        Instant from = Instant.now();
        Instant to   = from.plusSeconds((long) days * 86400);
        return eventService.getByDateRange(userId, from, to);
    }

    
    
    

    private List<Map<String, Object>> buildGeminiHistory(List<ChatMessage> messages, String userLocale, Long userId) {
        List<Map<String, Object>> result = new ArrayList<>();
        String aiLanguage = switch ((userLocale == null ? "en" : userLocale).toLowerCase(Locale.ROOT)) {
            case "ru", "ru-ru" -> "Russian";
            case "kk", "kk-kz" -> "Kazakh";
            default -> "English";
        };
        String languageContext = "User interface language: " + aiLanguage + ". Reply in this language unless the user explicitly asks for another.";
        
        String dateContext = "Current date/time (UTC): " + Instant.now();
        result.add(Map.of("role", "user", "parts",
                List.of(Map.of("text", languageContext))));
        result.add(Map.of("role", "model", "parts",
                List.of(Map.of("text", "Understood. I will respond in the requested interface language unless asked otherwise."))));
        result.add(Map.of("role", "user", "parts",
                List.of(Map.of("text", dateContext))));
        result.add(Map.of("role", "model", "parts",
                List.of(Map.of("text", "Understood. I have the current date/time context."))));

        String liveDataContext = buildLiveDataContext(userId);
        result.add(Map.of("role", "user", "parts",
                List.of(Map.of("text", liveDataContext))));
        result.add(Map.of("role", "model", "parts",
                List.of(Map.of("text", "Understood. I will use this latest app data when answering."))));

        for (ChatMessage m : messages) {
            result.add(Map.of(
                "role",  m.getRole() == MessageRole.USER ? "user" : "model",
                "parts", List.of(Map.of("text", m.getContent()))
            ));
        }
        return result;
    }

    private String buildLiveDataContext(Long userId) {
        try {
            var stats = taskService.stats(userId);
            var tasks = taskService.list(userId, null, null, null, null, 0, 8, "createdAt_desc").content();
            var habits = habitService.list(userId, true);
            var events = eventService.getByDateRange(userId, Instant.now(), Instant.now().plusSeconds(7L * 86400));

            String taskLines = tasks.stream()
                    .map(t -> "- " + t.title() + " [" + t.status() + "]" + (t.deadline() != null ? " due " + t.deadline() : ""))
                    .toList()
                    .toString();
            String habitLines = habits.stream()
                    .limit(8)
                    .map(h -> "- " + h.name() + " (streak=" + h.currentStreak() + ")")
                    .toList()
                    .toString();
            String eventLines = events.stream()
                    .limit(8)
                    .map(e -> "- " + e.title() + " at " + e.startTime())
                    .toList()
                    .toString();

            return """
                    Latest user data snapshot from app database:
                    Tasks stats: total=%d, todo=%d, in_progress=%d, done=%d, overdue=%d
                    Recent tasks: %s
                    Active habits (%d): %s
                    Upcoming events next 7 days (%d): %s
                    """.formatted(
                    stats.total(), stats.todo(), stats.inProgress(), stats.done(), stats.overdue(),
                    taskLines, habits.size(), habitLines, events.size(), eventLines
            );
        } catch (Exception e) {
            log.warn("Could not build live data context for AI chat: {}", e.getMessage());
            return "Latest app data snapshot is temporarily unavailable.";
        }
    }

    private List<ChatMessage> getHistory(Long convId) {
        
        List<ChatMessage> desc = msgRepo.findByConversationIdOrderByCreatedAtDesc(
                convId, PageRequest.of(0, MAX_HISTORY_MESSAGES));
        List<ChatMessage> asc = new ArrayList<>(desc);
        Collections.reverse(asc);
        return asc;
    }

    private String summarizeTool(String tool, Map<String, Object> args, Object result) {
        return switch (tool) {
            case "create_task"          -> "Created: '" + str(args, "title") + "'";
            case "list_tasks"           -> "Retrieved task list";
            case "get_task_stats"       -> "Fetched task statistics";
            case "create_habit"         -> "Created: '" + str(args, "name") + "'";
            case "list_habits"          -> "Retrieved habits";
            case "list_upcoming_events" -> "Retrieved upcoming events";
            default -> tool;
        };
    }

    private static String str(Map<String, Object> args, String key) {
        Object v = args.get(key);
        return v != null ? v.toString() : null;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max - 1) + "…";
    }

    private AiMessageResponse tryReturnRecentDuplicate(Long convId, String incomingText) {
        if (incomingText == null || incomingText.isBlank()) return null;
        List<ChatMessage> last = msgRepo.findByConversationIdOrderByCreatedAtDesc(
                convId, PageRequest.of(0, 2));
        if (last.size() < 2) return null;
        ChatMessage latest = last.get(0);
        ChatMessage prev = last.get(1);
        if (latest.getRole() != MessageRole.ASSISTANT || prev.getRole() != MessageRole.USER) return null;
        if (!incomingText.trim().equals(prev.getContent() == null ? "" : prev.getContent().trim())) return null;
        if (latest.getCreatedAt() == null) return null;
        if (Duration.between(latest.getCreatedAt(), Instant.now()).toMinutes() > 3) return null;

        ChatConversation conv = latest.getConversation();
        return new AiMessageResponse(
                conv.getId(),
                conv.getTitle(),
                latest.getId(),
                latest.getContent(),
                latest.getRole().name(),
                parseToolCalls(latest.getToolCalls()),
                latest.getCreatedAt()
        );
    }

    private String toJson(Object obj) {
        try { return objectMapper.writeValueAsString(obj); }
        catch (Exception e) { return "[]"; }
    }

    private List<ToolCallInfo> parseToolCalls(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) { return List.of(); }
    }
}
