package com.aero.repository;

import com.aero.entity.Reminder;
import com.aero.enums.ReminderStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface ReminderRepository extends JpaRepository<Reminder, Long> {
    Page<Reminder> findByUserId(Long userId, Pageable pageable);
    Optional<Reminder> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT r FROM Reminder r WHERE r.status = 'PENDING' AND r.remindAt <= :now")
    List<Reminder> findDueReminders(@Param("now") Instant now);

    @Modifying
    @Query("UPDATE Reminder r SET r.status = :status, r.sentAt = :sentAt WHERE r.id = :id")
    void updateStatus(@Param("id") Long id,
                      @Param("status") ReminderStatus status,
                      @Param("sentAt") Instant sentAt);
}
