package com.aero.service.impl;

import com.aero.dto.request.HabitCheckRequest;
import com.aero.dto.request.HabitRequest;
import com.aero.dto.response.HabitCompletionResponse;
import com.aero.dto.response.HabitResponse;
import com.aero.dto.response.HabitStatsResponse;
import com.aero.entity.Habit;
import com.aero.entity.HabitCompletion;
import com.aero.entity.User;
import com.aero.exception.ConflictException;
import com.aero.exception.NotFoundException;
import com.aero.mapper.HabitMapper;
import com.aero.repository.HabitCompletionRepository;
import com.aero.repository.HabitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HabitService {

    private final HabitRepository           habitRepo;
    private final HabitCompletionRepository completionRepo;
    private final HabitMapper               habitMapper;



    @Transactional
    public HabitResponse create(Long userId, HabitRequest req) {
        Habit habit = habitMapper.toEntity(req);
        habit.setUser(User.builder().id(userId).build());
        return enrich(habitRepo.save(habit));
    }



    @Transactional(readOnly = true)
    public HabitResponse getById(Long userId, Long habitId) {
        return enrich(findOwned(userId, habitId));
    }



    @Transactional(readOnly = true)
    public List<HabitResponse> list(Long userId, boolean activeOnly) {
        List<Habit> habits = activeOnly
                ? habitRepo.findByUserIdAndActiveTrue(userId)
                : habitRepo.findByUserId(userId);
        return habits.stream().map(this::enrich).toList();
    }



    @Transactional
    public HabitResponse update(Long userId, Long habitId, HabitRequest req) {
        Habit habit = findOwned(userId, habitId);
        habitMapper.updateFromRequest(req, habit);
        return enrich(habitRepo.save(habit));
    }



    @Transactional
    public void archive(Long userId, Long habitId) {
        Habit habit = findOwned(userId, habitId);
        habit.setActive(false);
        habitRepo.save(habit);
    }

    @Transactional
    public void delete(Long userId, Long habitId) {
        habitRepo.delete(findOwned(userId, habitId));
    }



    @Transactional
    public HabitCompletionResponse checkIn(Long userId, Long habitId, HabitCheckRequest req) {
        Habit habit = findOwned(userId, habitId);

        if (completionRepo.findByHabitIdAndCompletedOn(habitId, req.date()).isPresent()) {
            throw new ConflictException("Habit already checked in for " + req.date());
        }

        HabitCompletion completion = HabitCompletion.builder()
                .habit(habit)
                .user(User.builder().id(userId).build())
                .completedOn(req.date())
                .note(req.note())
                .build();

        return habitMapper.toCompletionResponse(completionRepo.save(completion));
    }



    @Transactional
    public void uncheck(Long userId, Long habitId, LocalDate date) {
        findOwned(userId, habitId);
        HabitCompletion c = completionRepo.findByHabitIdAndCompletedOn(habitId, date)
                .orElseThrow(() -> new NotFoundException("No check-in found for " + date));
        completionRepo.delete(c);
    }



    @Transactional(readOnly = true)
    public HabitStatsResponse getStats(Long userId, Long habitId) {
        Habit habit = findOwned(userId, habitId);

        LocalDate today     = resolveToday(habit);
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate monthStart = today.withDayOfMonth(1);
        LocalDate monthEnd  = YearMonth.from(today).atEndOfMonth();

        List<LocalDate> thisMonthDates = completionRepo
                .findByHabitIdAndCompletedOnBetween(habitId, monthStart, monthEnd)
                .stream().map(HabitCompletion::getCompletedOn).toList();

        List<LocalDate> thisWeekDates = completionRepo
                .findByHabitIdAndCompletedOnBetween(habitId, weekStart,
                        weekStart.plusDays(6))
                .stream().map(HabitCompletion::getCompletedOn).toList();

        int target = habit.getTargetPerWeek() != null ? habit.getTargetPerWeek() : 7;
        double weekRate  = (double) thisWeekDates.size()  / 7 * 100;
        double monthRate = (double) thisMonthDates.size() / monthEnd.getDayOfMonth() * 100;

        int[] streaks = calculateStreaks(habitId, today);

        return new HabitStatsResponse(
                habitId,
                habit.getName(),
                streaks[0],
                streaks[1],
                completionRepo.countByHabitId(habitId),
                Math.min(weekRate, 100),
                Math.min(monthRate, 100),
                thisMonthDates,
                completionRepo.findByHabitIdAndCompletedOn(habitId, today).isPresent()
        );
    }







    private int[] calculateStreaks(Long habitId, LocalDate today) {
        List<LocalDate> allDates = completionRepo
                .findAllByHabitIdOrderByDateDesc(habitId)
                .stream()
                .map(HabitCompletion::getCompletedOn)
                .sorted((a, b) -> b.compareTo(a))
                .toList();

        if (allDates.isEmpty()) return new int[]{0, 0};

        Set<LocalDate> dateSet = allDates.stream().collect(Collectors.toSet());


        int current = 0;
        LocalDate cursor = today;
        if (!dateSet.contains(cursor)) cursor = cursor.minusDays(1);
        while (dateSet.contains(cursor)) {
            current++;
            cursor = cursor.minusDays(1);
        }


        int longest = 0;
        int running = 0;
        LocalDate prev = null;
        for (LocalDate d : allDates.stream().sorted().toList()) {
            if (prev == null || d.minusDays(1).equals(prev)) {
                running++;
            } else {
                running = 1;
            }
            longest = Math.max(longest, running);
            prev = d;
        }

        return new int[]{current, longest};
    }



    private HabitResponse enrich(Habit habit) {
        int[] streaks = calculateStreaks(habit.getId(), resolveToday(habit));
        long total    = completionRepo.countByHabitId(habit.getId());
        HabitResponse base = habitMapper.toResponse(habit);
        return new HabitResponse(
                base.id(), base.name(), base.description(),
                base.frequency(), base.targetPerWeek(),
                base.color(), base.icon(), base.active(),
                streaks[0], streaks[1], total, base.createdAt()
        );
    }

    private Habit findOwned(Long userId, Long habitId) {
        return habitRepo.findByIdAndUserId(habitId, userId)
                .orElseThrow(() -> NotFoundException.of("Habit", habitId));
    }

    private LocalDate resolveToday(Habit habit) {
        String tz = "UTC";
        try {
            if (habit.getUser() != null && habit.getUser().getTimezone() != null && !habit.getUser().getTimezone().isBlank()) {
                tz = habit.getUser().getTimezone();
            }
            return LocalDate.now(ZoneId.of(tz));
        } catch (Exception ignored) {
            return LocalDate.now();
        }
    }
}
