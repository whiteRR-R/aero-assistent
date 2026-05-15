package com.aero.repository;

import com.aero.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface NoteRepository extends JpaRepository<Note, Long> {

    Page<Note> findByUserId(Long userId, Pageable pageable);

    Page<Note> findByUserIdAndCategoryId(Long userId, Long categoryId, Pageable pageable);

    Page<Note> findByUserIdAndPinnedTrue(Long userId, Pageable pageable);

    Optional<Note> findByIdAndUserId(Long id, Long userId);

    
    @Query(value = """
            SELECT * FROM notes
            WHERE user_id = :userId
              AND to_tsvector('simple', title || ' ' || COALESCE(content, ''))
                  @@ plainto_tsquery('simple', :query)
            """,
           countQuery = """
            SELECT COUNT(*) FROM notes
            WHERE user_id = :userId
              AND to_tsvector('simple', title || ' ' || COALESCE(content, ''))
                  @@ plainto_tsquery('simple', :query)
            """,
           nativeQuery = true)
    Page<Note> fullTextSearch(
            @Param("userId") Long userId,
            @Param("query")  String query,
            Pageable pageable
    );
}
