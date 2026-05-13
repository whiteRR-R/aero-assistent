package com.aero.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "habit_completions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "completed_on"}))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class HabitCompletion {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "completed_on", nullable = false)
    private LocalDate completedOn;

    @Column(columnDefinition = "TEXT")
    private String note;
}
