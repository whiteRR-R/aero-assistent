package com.aero.repository;
import com.aero.entity.ProfileHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ProfileHistoryRepository extends JpaRepository<ProfileHistory, Long> {
    List<ProfileHistory> findByUserIdOrderByChangedAtDesc(Long userId);
}
