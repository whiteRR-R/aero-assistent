package com.aero.repository;
import com.aero.entity.NoteCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
public interface NoteCategoryRepository extends JpaRepository<NoteCategory, Long> {
    List<NoteCategory> findByUserId(Long userId);
    Optional<NoteCategory> findByIdAndUserId(Long id, Long userId);
    boolean existsByUserIdAndName(Long userId, String name);
}
