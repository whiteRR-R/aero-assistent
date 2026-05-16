package com.aero.controller;

import com.aero.dto.request.QuickCaptureRequest;
import com.aero.dto.response.DailyBriefResponse;
import com.aero.dto.response.HeatmapEntry;
import com.aero.dto.response.QuickCaptureResponse;
import com.aero.dto.response.WeeklyReviewResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.AiBriefService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@Tag(name = "AI Brief", description = "Heatmap, daily brief, weekly review, quick capture")
public class AiBriefController {

    private final AiBriefService aiBriefService;

    

    @GetMapping("/heatmap")
    @Operation(summary = "Get productivity heatmap (completed tasks per day)")
    public ResponseEntity<List<HeatmapEntry>> heatmap(
            @RequestParam(defaultValue = "365") int days) {
        return ResponseEntity.ok(aiBriefService.getHeatmap(SecurityUtil.currentUserId(), days));
    }

    

    @GetMapping("/daily-brief")
    @Operation(summary = "Get AI-generated personalized daily brief")
    public ResponseEntity<DailyBriefResponse> dailyBrief() {
        return ResponseEntity.ok(aiBriefService.getDailyBrief(SecurityUtil.currentUserId()));
    }

    

    @GetMapping("/weekly-review")
    @Operation(summary = "Get AI-generated weekly productivity review")
    public ResponseEntity<WeeklyReviewResponse> weeklyReview() {
        return ResponseEntity.ok(aiBriefService.getWeeklyReview(SecurityUtil.currentUserId()));
    }

    

    @PostMapping("/quick-capture")
    @Operation(summary = "Create task/habit/event from natural language text")
    public ResponseEntity<QuickCaptureResponse> quickCapture(
            @Valid @RequestBody QuickCaptureRequest request) {
        return ResponseEntity.ok(aiBriefService.quickCapture(SecurityUtil.currentUserId(), request));
    }
}
