package com.aero.repository;
import com.aero.entity.CalendarIntegration;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface CalendarIntegrationRepository extends JpaRepository<CalendarIntegration, Long> {
    Optional<CalendarIntegration> findByUserIdAndProvider(Long userId, String provider);
}
