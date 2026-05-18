package com.aero.service.impl;

import com.aero.dto.request.UpdateProfileRequest;
import com.aero.dto.response.ProfileHistoryResponse;
import com.aero.dto.response.UserResponse;
import com.aero.entity.ProfileHistory;
import com.aero.entity.User;
import com.aero.exception.NotFoundException;
import com.aero.mapper.UserMapper;
import com.aero.repository.ProfileHistoryRepository;
import com.aero.repository.UserRepository;
import com.aero.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository           userRepo;
    private final ProfileHistoryRepository historyRepo;
    private final FileStorageService       fileStorage;
    private final UserMapper               userMapper;



    @Transactional(readOnly = true)
    public UserResponse getProfile(Long userId) {
        return userMapper.toResponse(findUser(userId));
    }



    @Transactional
    public UserResponse updateProfile(Long userId, UpdateProfileRequest req) {
        User user = findUser(userId);

        applyChange(userId, "fullName",  user.getFullName(),  req.fullName());
        applyChange(userId, "bio",       user.getBio(),       req.bio());
        applyChange(userId, "timezone",  user.getTimezone(),  req.timezone());
        applyChange(userId, "locale",    user.getLocale(),    req.locale());

        if (req.fullName()  != null) user.setFullName(req.fullName());
        if (req.bio()       != null) user.setBio(req.bio());
        if (req.timezone()  != null) user.setTimezone(req.timezone());
        if (req.locale()    != null) user.setLocale(req.locale());

        return userMapper.toResponse(userRepo.save(user));
    }



    @Transactional
    public UserResponse uploadAvatar(Long userId, MultipartFile file) {
        User user = findUser(userId);

        if (user.getAvatarUrl() != null) {
            fileStorage.delete(user.getAvatarUrl());
        }

        String url = fileStorage.store(file, "avatars");
        applyChange(userId, "avatarUrl", user.getAvatarUrl(), url);
        user.setAvatarUrl(url);

        return userMapper.toResponse(userRepo.save(user));
    }



    @Transactional(readOnly = true)
    public List<ProfileHistoryResponse> getHistory(Long userId) {
        return historyRepo.findByUserIdOrderByChangedAtDesc(userId).stream()
                .map(h -> new ProfileHistoryResponse(
                        h.getId(), h.getFieldName(),
                        h.getOldValue(), h.getNewValue(), h.getChangedAt()))
                .toList();
    }



    private User findUser(Long userId) {
        return userRepo.findById(userId)
                .orElseThrow(() -> NotFoundException.of("User", userId));
    }

    private void applyChange(Long userId, String field, String oldVal, String newVal) {
        if (newVal != null && !newVal.equals(oldVal)) {
            historyRepo.save(ProfileHistory.builder()
                    .user(User.builder().id(userId).build())
                    .fieldName(field)
                    .oldValue(oldVal)
                    .newValue(newVal)
                    .build());
        }
    }
}
