package com.aero.dto.response;
import java.time.LocalTime;
import java.util.List;
public record NotificationPrefResponse(
    Boolean emailEnabled,
    Boolean pushEnabled,
    List<Integer> reminderMinutes,
    Boolean dailyDigest,
    LocalTime digestTime
) {}
