package com.aero.controller;

import com.aero.dto.request.UpdateProfileRequest;
import com.aero.dto.response.ProfileHistoryResponse;
import com.aero.dto.response.UserResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "Personal profile management & edit history")
public class ProfileController {

    private final ProfileService profileService;

    @GetMapping
    @Operation(summary = "Get current user profile")
    public UserResponse getProfile() {
        return profileService.getProfile(SecurityUtil.currentUserId());
    }

    @PatchMapping
    @Operation(summary = "Update profile fields (partial update)")
    public UserResponse updateProfile(@Valid @RequestBody UpdateProfileRequest req) {
        return profileService.updateProfile(SecurityUtil.currentUserId(), req);
    }

    @PostMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload profile avatar (JPEG/PNG/WebP, max 10 MB)")
    public UserResponse uploadAvatar(@RequestParam("file") MultipartFile file) {
        return profileService.uploadAvatar(SecurityUtil.currentUserId(), file);
    }

    @GetMapping("/history")
    @Operation(summary = "Get profile change history")
    public List<ProfileHistoryResponse> getHistory() {
        return profileService.getHistory(SecurityUtil.currentUserId());
    }
}
