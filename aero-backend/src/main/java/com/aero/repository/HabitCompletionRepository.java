package com.aero.repository;
import com.aero.entity.HabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {
    Optional<HabitCompletion> findByHabitIdAndCompletedOn(Long habitId, LocalDate date);
    List<HabitCompletion> findByHabitIdAndCompletedOnBetween(Long habitId, LocalDate from, LocalDate to);
    long countByHabitId(Long habitId);

    @Query("""
        SELECT hc FROM HabitCompletion hc
        WHERE hc.habit.id = :habitId
        ORDER BY hc.completedOn DESC
        """)
    List<HabitCompletion> findAllByHabitIdOrderByDateDesc(@Param("habitId") Long habitId);
}
