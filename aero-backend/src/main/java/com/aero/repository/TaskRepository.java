package com.aero.repository;

import com.aero.entity.Task;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    Page<Task> findByUserId(Long userId, Pageable pageable);

    Page<Task> findByUserIdAndStatus(Long userId, TaskStatus status, Pageable pageable);

    Page<Task> findByUserIdAndPriority(Long userId, TaskPriority priority, Pageable pageable);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId AND t.deadline BETWEEN :from AND :to")
    List<Task> findUpcoming(
            @Param("userId") Long userId,
            @Param("from")   Instant from,
            @Param("to")     Instant to
    );

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    long countByUserId(Long userId);

    
    @Query(value = """
            SELECT TO_CHAR(completed_at AT TIME ZONE :timezone, 'YYYY-MM-DD') AS date,
                   COUNT(*) AS count
            FROM tasks
            WHERE user_id  = :userId
              AND completed_at IS NOT NULL
              AND completed_at >= :from
              AND completed_at <  :to
            GROUP BY 1
            ORDER BY 1
            """, nativeQuery = true)
    List<Object[]> findCompletionHeatmap(
            @Param("userId") Long userId,
            @Param("from")   Instant from,
            @Param("to")     Instant to,
            @Param("timezone") String timezone
    );

    long countByUserIdAndCompletedAtBetween(Long userId, Instant from, Instant to);

    long countByUserIdAndCreatedAtBetween(Long userId, Instant from, Instant to);

    long countByUserIdAndStatus(Long userId, TaskStatus status);
}
