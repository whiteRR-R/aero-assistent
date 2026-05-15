package com.aero.repository;

import com.aero.entity.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends JpaRepository<Event, Long> {

    Page<Event> findByUserId(Long userId, Pageable pageable);

    Optional<Event> findByIdAndUserId(Long id, Long userId);

    
    @Query("""
            SELECT e FROM Event e
            WHERE e.user.id = :userId
              AND e.startTime < :to
              AND (e.endTime IS NULL OR e.endTime > :from)
            ORDER BY e.startTime
            """)
    List<Event> findByUserIdAndDateRange(
            @Param("userId") Long userId,
            @Param("from")   Instant from,
            @Param("to")     Instant to
    );

    
    @Query("""
            SELECT e FROM Event e
            WHERE e.user.id = :userId
              AND e.startTime BETWEEN :from AND :to
            ORDER BY e.startTime
            """)
    List<Event> findUpcoming(
            @Param("userId") Long userId,
            @Param("from")   Instant from,
            @Param("to")     Instant to
    );
}
