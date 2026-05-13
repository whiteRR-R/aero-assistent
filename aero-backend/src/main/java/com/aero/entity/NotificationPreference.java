package com.aero.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;

@Entity
@Table(name = "notification_preferences")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NotificationPreference {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "email_enabled")
    @Builder.Default
    private Boolean emailEnabled = true;

    @Column(name = "push_enabled")
    @Builder.Default
    private Boolean pushEnabled = false;

    @Column(name = "reminder_minutes")
    private int[] reminderMinutes;

    @Column(name = "daily_digest")
    @Builder.Default
    private Boolean dailyDigest = false;

    @Column(name = "digest_time")
    @Builder.Default
    private LocalTime digestTime = LocalTime.of(8, 0);
}
