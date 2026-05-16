package com.aero.service.impl;

import com.aero.dto.request.QuickCaptureRequest;
import com.aero.dto.request.TaskRequest;
import com.aero.dto.request.HabitRequest;
import com.aero.dto.response.*;
import com.aero.entity.User;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import com.aero.repository.HabitCompletionRepository;
import com.aero.repository.TaskRepository;
import com.aero.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class AiBriefService {

    private final GeminiService              gemini;
    private final TaskService                taskService;
    private final HabitService               habitService;
    private final EventService               eventService;
    private final TaskRepository             taskRepo;
    private final HabitCompletionRepository  completionRepo;
    private final UserRepository             userRepo;
    private final Map<String, CachedBrief> dailyBriefCache = new ConcurrentHashMap<>();
    private final Map<String, CachedReview> weeklyReviewCache = new ConcurrentHashMap<>();

    
    
    

    @Transactional(readOnly = true)
    public List<HeatmapEntry> getHeatmap(Long userId, int days) {
        User user = userRepo.findById(userId).orElseThrow();
        ZoneId zone;
        try {
            zone = ZoneId.of(user.getTimezone());
        } catch (Exception ignored) {
            zone = ZoneOffset.UTC;
        }

        LocalDate today = LocalDate.now(zone);
        Instant from = today.minusDays(days - 1L).atStartOfDay(zone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(zone).toInstant();

        List<Object[]> rows = taskRepo.findCompletionHeatmap(userId, from, to, zone.getId());
        return rows.stream()
                .map(r -> new HeatmapEntry((String) r[0], ((Number) r[1]).longValue()))
                .collect(Collectors.toList());
    }

    
    
    

    @Transactional(readOnly = true)
    public DailyBriefResponse getDailyBrief(Long userId) {
        String dailyKey = "u:" + userId + ":d:" + LocalDate.now(ZoneOffset.UTC);
        CachedBrief cached = dailyBriefCache.get(dailyKey);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.value();
        }

        String locale = userRepo.findById(userId).map(User::getLocale).orElse("en");
        String languageName = languageName(locale);
        Instant now       = Instant.now();
        Instant todayStart= now.truncatedTo(java.time.temporal.ChronoUnit.DAYS);
        Instant todayEnd  = todayStart.plusSeconds(86400);
        Instant ystStart  = todayStart.minusSeconds(86400);

        
        var tasks  = taskService.list(userId, null, null, null, null, 0, 100, "deadline");
        long dueToday = tasks.content().stream()
                .filter(t -> t.deadline() != null
                        && !t.deadline().isBefore(todayStart)
                        && t.deadline().isBefore(todayEnd)
                        && isOpenTask(t.status()))
                .count();

        
        long overdue = taskService.stats(userId).overdue();

        
        var events = eventService.getByDateRange(userId, todayStart, todayEnd);

        
        var habits = habitService.list(userId, true);
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        long habitsAtRisk = habits.stream()
                .filter(h -> completionRepo
                        .findByHabitIdAndCompletedOn(h.id(), today)
                        .isEmpty())
                .count();

        
        long completedYst = taskRepo.countByUserIdAndCompletedAtBetween(userId, ystStart, todayStart);
        long createdYst   = taskRepo.countByUserIdAndCreatedAtBetween(userId, ystStart, todayStart);
        double ystRate    = createdYst > 0 ? (completedYst * 100.0 / createdYst) : 0;

        
        String taskSummary = tasks.content().stream()
                .filter(t -> t.deadline() != null
                        && t.deadline().isBefore(todayEnd)
                        && isOpenTask(t.status()))
                .limit(5)
                .map(t -> "- " + t.title() + " (" + t.priority() + ")")
                .collect(Collectors.joining("\n"));

        String eventSummary = events.stream().limit(3)
                .map(e -> "- " + e.title() + " at " + e.startTime())
                .collect(Collectors.joining("\n"));

        int hour = LocalTime.now(ZoneOffset.UTC).getHour();
        String timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

        String prompt = String.format("""
                It is %s (%s UTC).

                User's productivity data:
                - Tasks due today: %d
                %s
                - Overdue tasks: %d
                - Habits not yet done today: %d out of %d active habits
                - Events today: %d
                %s
                - Yesterday: %.0f%% completion rate (%d completed)

                Write a personalized daily brief (3–4 sentences, no bullet points).
                Rules:
                - Greet naturally for the time of day
                - Highlight the 1 most important thing to focus on
                - Mention habit risk if relevant
                - End with brief encouragement
                - Reply strictly in %s unless the user explicitly requests another language
                - No markdown, no headers, flowing prose only
                """,
                timeOfDay, now, dueToday, taskSummary,
                overdue, habitsAtRisk, habits.size(),
                events.size(), eventSummary, ystRate, completedYst, languageName);

        String brief = gemini.generateText(
                "You are AERO, a concise and motivating productivity assistant.", prompt);

        DailyBriefResponse response = new DailyBriefResponse(
                brief,
                now,
                new DailyBriefResponse.Stats(dueToday, overdue, habitsAtRisk, events.size(), ystRate)
        );
        dailyBriefCache.put(dailyKey, new CachedBrief(response, Instant.now().plus(20, ChronoUnit.MINUTES)));
        return response;
    }

    
    
    

    @Transactional(readOnly = true)
    public WeeklyReviewResponse getWeeklyReview(Long userId) {
        String weeklyKey = "u:" + userId + ":w:" + LocalDate.now(ZoneOffset.UTC).with(DayOfWeek.MONDAY);
        CachedReview cached = weeklyReviewCache.get(weeklyKey);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) {
            return cached.value();
        }

        String locale = userRepo.findById(userId).map(User::getLocale).orElse("en");
        String languageName = languageName(locale);
        Instant now      = Instant.now();
        Instant weekAgo  = now.minusSeconds(7L * 86400);
        Instant twoWkAgo = now.minusSeconds(14L * 86400);

        
        long completed  = taskRepo.countByUserIdAndCompletedAtBetween(userId, weekAgo, now);
        long created    = taskRepo.countByUserIdAndCreatedAtBetween(userId, weekAgo, now);
        double compRate = created > 0 ? (completed * 100.0 / created) : 0;

        
        long prevCompleted = taskRepo.countByUserIdAndCompletedAtBetween(userId, twoWkAgo, weekAgo);
        double vsLast = prevCompleted > 0
                ? ((completed - prevCompleted) * 100.0 / prevCompleted) : 0;

        
        var habits = habitService.list(userId, true);
        LocalDate weekAgoDate = LocalDate.now(ZoneOffset.UTC).minusDays(7);
        LocalDate todayDate   = LocalDate.now(ZoneOffset.UTC);
        long totalCheckIns = habits.stream()
                .mapToLong(h -> completionRepo
                        .findByHabitIdAndCompletedOnBetween(h.id(), weekAgoDate, todayDate)
                        .size())
                .sum();

        
        var heatmap = getHeatmap(userId, 7);
        String mostProductiveDay = heatmap.stream()
                .max(Comparator.comparingLong(HeatmapEntry::count))
                .map(e -> {
                    LocalDate d = LocalDate.parse(e.date());
                    return d.getDayOfWeek().getDisplayName(TextStyle.FULL, Locale.ENGLISH);
                })
                .orElse("N/A");

        
        String habitSummary = habits.stream().limit(5)
                .map(h -> "- " + h.name() + ": streak=" + h.currentStreak())
                .collect(Collectors.joining("\n"));

        String heatmapSummary = heatmap.stream()
                .map(e -> e.date() + "=" + e.count())
                .collect(Collectors.joining(", "));

        String prompt = String.format("""
                Generate a weekly productivity review for the past 7 days.

                Data:
                - Tasks completed: %d (created: %d, completion rate: %.0f%%)
                - vs previous week: %+.0f%%
                - Habit check-ins: %d total across %d active habits
                - Most productive day: %s
                - Daily completions: %s
                Habit details:
                %s

                Write a structured weekly review (5–7 sentences, no markdown headers).
                Include:
                1. Overall assessment (good/ok/needs improvement)
                2. What went well
                3. What needs attention (specific habits or task completion rate)
                4. One concrete recommendation for next week
                5. Closing motivational line

                Reply strictly in %s unless the user explicitly requests another language.
                Flowing prose, no bullet points, no markdown.
                """,
                completed, created, compRate,
                vsLast, totalCheckIns, habits.size(),
                mostProductiveDay, heatmapSummary, habitSummary, languageName);

        String review = gemini.generateText(
                "You are AERO, a weekly productivity coach. Be insightful, specific, and encouraging.", prompt);

        WeeklyReviewResponse response = new WeeklyReviewResponse(
                review,
                now,
                new WeeklyReviewResponse.Stats(completed, created, compRate,
                        totalCheckIns, mostProductiveDay, vsLast)
        );
        weeklyReviewCache.put(weeklyKey, new CachedReview(response, Instant.now().plus(6, ChronoUnit.HOURS)));
        return response;
    }

    
    
    

    public QuickCaptureResponse quickCapture(Long userId, QuickCaptureRequest req) {
        
        String parsePrompt = String.format("""
                The user typed: "%s"

                Today is %s (UTC).

                Classify this as ONE of: task, habit, event, unknown

                Then extract the relevant fields as JSON on a SINGLE line like:
                ACTION: task
                JSON: {"title":"...","priority":"MEDIUM","deadline":"2025-06-01T10:00:00Z"}

                For task: title (required), description, priority (LOW/MEDIUM/HIGH/URGENT), deadline (ISO UTC)
                For habit: name (required), description, frequency (DAILY/WEEKLY/CUSTOM), targetPerWeek (1-7)
                For event: title (required), description, startTime (ISO UTC required), endTime (ISO UTC), location
                For unknown: just reply ACTION: unknown

                Rules:
                - Resolve relative dates ("tomorrow", "next Friday") from today's date
                - If no time specified for deadline, use end of day (23:59:59)
                - Be smart about priority: "urgent", "asap", "срочно" → URGENT; "important" → HIGH
                """, req.text(), Instant.now());

        String raw = gemini.generateText(
                "You are a precise NLP parser. Output only the requested format, no extra text.",
                parsePrompt);

        String locale = userRepo.findById(userId).map(User::getLocale).orElse("en");
        return parseAndCreate(raw, userId, req.text(), locale);
    }

    private QuickCaptureResponse parseAndCreate(String raw, Long userId, String originalText, String locale) {
        try {
            String action  = extractLine(raw, "ACTION:").toLowerCase().trim();
            String jsonStr = extractLine(raw, "JSON:");

            return switch (action) {
                case "task" -> createTaskFromJson(jsonStr, userId, locale);
                case "habit" -> createHabitFromJson(jsonStr, userId, locale);
                case "event" -> createEventFromJson(jsonStr, userId, locale);
                default -> new QuickCaptureResponse("unknown",
                        localizedUnknown(locale, originalText), null);
            };
        } catch (Exception e) {
            log.error("QuickCapture parse error, raw={}", raw, e);
            return new QuickCaptureResponse("unknown", localizedParseError(locale), null);
        }
    }

    private QuickCaptureResponse createTaskFromJson(String json, Long userId, String locale) throws Exception {
        var map = parseJson(json);
        TaskRequest req = new TaskRequest(
                str(map, "title"),
                str(map, "description"),
                TaskStatus.TODO,
                priority(str(map, "priority")),
                deadline(str(map, "deadline")),
                Set.of()
        );
        TaskResponse created = taskService.create(userId, req);
        return new QuickCaptureResponse("task",
                localizedCreated(locale, "task", created.title()), created);
    }

    private QuickCaptureResponse createHabitFromJson(String json, Long userId, String locale) throws Exception {
        var map = parseJson(json);
        com.aero.enums.HabitFrequency freq = com.aero.enums.HabitFrequency.DAILY;
        String fStr = str(map, "frequency");
        if (fStr != null) {
            try { freq = com.aero.enums.HabitFrequency.valueOf(fStr.toUpperCase()); }
            catch (Exception ignored) {}
        }
        Number tpw = map.containsKey("targetPerWeek") ? (Number) map.get("targetPerWeek") : null;
        HabitRequest req = new HabitRequest(str(map, "name"), str(map, "description"),
                freq, tpw != null ? tpw.intValue() : 7, null, null);
        HabitResponse created = habitService.create(userId, req);
        return new QuickCaptureResponse("habit",
                localizedCreated(locale, "habit", created.name()), created);
    }

    private QuickCaptureResponse createEventFromJson(String json, Long userId, String locale) throws Exception {
        var map = parseJson(json);
        String startStr = str(map, "startTime");
        if (startStr == null) throw new IllegalArgumentException("startTime required");
        var req = new com.aero.dto.request.EventRequest(
                str(map, "title"), str(map, "description"), str(map, "location"),
                Instant.parse(startStr),
                str(map, "endTime") != null ? Instant.parse(str(map, "endTime")) : null,
                false, null, null
        );
        EventResponse created = eventService.create(userId, req);
        return new QuickCaptureResponse("event",
                localizedCreated(locale, "event", created.title()), created);
    }

    
    
    

    private static String extractLine(String text, String prefix) {
        return Arrays.stream(text.split("\n"))
                .filter(l -> l.startsWith(prefix))
                .map(l -> l.substring(prefix.length()).trim())
                .findFirst()
                .orElse("");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) throws Exception {
        if (json == null || json.isBlank()) throw new IllegalArgumentException("empty JSON");
        com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
        return om.readValue(json, Map.class);
    }

    private static String str(Map<String, Object> m, String k) {
        Object v = m.get(k); return v != null ? v.toString() : null;
    }

    private static TaskPriority priority(String s) {
        if (s == null) return TaskPriority.MEDIUM;
        try { return TaskPriority.valueOf(s.toUpperCase()); }
        catch (Exception e) { return TaskPriority.MEDIUM; }
    }

    private static Instant deadline(String s) {
        if (s == null || s.isBlank()) return null;
        try { return Instant.parse(s); } catch (Exception e) { return null; }
    }

    private static String languageName(String locale) {
        String normalized = locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "ru", "ru-ru" -> "Russian";
            case "kk", "kk-kz" -> "Kazakh";
            default -> "English";
        };
    }

    private static boolean isOpenTask(String status) {
        if (status == null) return false;
        String s = status.trim().toUpperCase(Locale.ROOT);
        return !s.equals("DONE") && !s.equals("CANCELLED");
    }

    private static String localizedCreated(String locale, String type, String title) {
        String normalized = locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "ru", "ru-ru" -> switch (type) {
                case "task" -> "✓ Задача создана: \"" + title + "\"";
                case "habit" -> "✓ Привычка создана: \"" + title + "\"";
                case "event" -> "✓ Событие создано: \"" + title + "\"";
                default -> "✓ Создано: \"" + title + "\"";
            };
            case "kk", "kk-kz" -> switch (type) {
                case "task" -> "✓ Тапсырма жасалды: \"" + title + "\"";
                case "habit" -> "✓ Әдет жасалды: \"" + title + "\"";
                case "event" -> "✓ Оқиға жасалды: \"" + title + "\"";
                default -> "✓ Жасалды: \"" + title + "\"";
            };
            default -> switch (type) {
                case "task" -> "✓ Task created: \"" + title + "\"";
                case "habit" -> "✓ Habit created: \"" + title + "\"";
                case "event" -> "✓ Event created: \"" + title + "\"";
                default -> "✓ Created: \"" + title + "\"";
            };
        };
    }

    private static String localizedUnknown(String locale, String originalText) {
        String normalized = locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "ru", "ru-ru" -> "Не удалось распознать: \"" + originalText + "\"";
            case "kk", "kk-kz" -> "Тану мүмкін болмады: \"" + originalText + "\"";
            default -> "Could not understand: \"" + originalText + "\"";
        };
    }

    private static String localizedParseError(String locale) {
        String normalized = locale == null ? "en" : locale.toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "ru", "ru-ru" -> "Не удалось обработать запрос.";
            case "kk", "kk-kz" -> "Сұрауды өңдеу мүмкін болмады.";
            default -> "Could not parse the request.";
        };
    }

    private record CachedBrief(DailyBriefResponse value, Instant expiresAt) {}
    private record CachedReview(WeeklyReviewResponse value, Instant expiresAt) {}
}
