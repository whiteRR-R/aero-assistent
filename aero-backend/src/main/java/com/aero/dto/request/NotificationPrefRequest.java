package com.aero.dto.request;

import java.time.LocalTime;
import java.util.List;

public record NotificationPrefRequest(
    Boolean emailEnabled,
    Boolean pushEnabled,
    List<Integer> reminderMinutes,
    Boolean dailyDigest,
    LocalTime digestTime
) {}
