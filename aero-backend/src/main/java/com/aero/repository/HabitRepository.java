package com.aero.repository;

import com.aero.entity.Habit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface HabitRepository extends JpaRepository<Habit, Long> {
    List<Habit> findByUserIdAndActiveTrue(Long userId);
    List<Habit> findByUserId(Long userId);
    Optional<Habit> findByIdAndUserId(Long id, Long userId);
}
