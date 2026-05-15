package com.aero.repository;

import com.aero.entity.ChatConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ChatConversationRepository extends JpaRepository<ChatConversation, Long> {
    Page<ChatConversation> findByUserId(Long userId, Pageable pageable);
    Optional<ChatConversation> findByIdAndUserId(Long id, Long userId);
}
