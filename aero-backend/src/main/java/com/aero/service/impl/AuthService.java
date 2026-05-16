package com.aero.service.impl;

import com.aero.dto.request.LoginRequest;
import com.aero.dto.request.RegisterRequest;
import com.aero.dto.response.AuthResponse;
import com.aero.dto.response.UserResponse;
import com.aero.entity.RefreshToken;
import com.aero.entity.User;
import com.aero.exception.ConflictException;
import com.aero.exception.UnauthorizedException;
import com.aero.mapper.UserMapper;
import com.aero.repository.RefreshTokenRepository;
import com.aero.repository.UserRepository;
import com.aero.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository        userRepo;
    private final RefreshTokenRepository refreshRepo;
    private final PasswordEncoder        encoder;
    private final JwtService             jwtService;
    private final UserMapper             userMapper;

    @Value("${aero.jwt.expiration}")
    private long accessTtl;

    @Value("${aero.jwt.refresh-expiration}")
    private long refreshTtl;

    

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.email())) {
            throw new ConflictException("Email already registered: " + req.email());
        }

        User user = User.builder()
                .email(req.email())
                .passwordHash(encoder.encode(req.password()))
                .fullName(req.fullName())
                .build();

        userRepo.save(user);
        log.info("New user registered: {}", user.getEmail());

        return buildAuthResponse(user);
    }

    

    @Transactional
    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByEmail(req.email())
                .orElseThrow(() -> new UnauthorizedException("Invalid email or password"));

        if (user.getPasswordHash() == null ||
            !encoder.matches(req.password(), user.getPasswordHash())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!user.getEnabled()) {
            throw new UnauthorizedException("Account is disabled");
        }

        return buildAuthResponse(user);
    }

    

    @Transactional
    public AuthResponse refresh(String rawToken) {
        RefreshToken stored = refreshRepo.findByToken(rawToken)
                .orElseThrow(() -> new UnauthorizedException("Refresh token not found"));

        if (stored.getRevoked()) {
            throw new UnauthorizedException("Refresh token has been revoked");
        }
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            throw new UnauthorizedException("Refresh token has expired");
        }

        
        stored.setRevoked(true);
        refreshRepo.save(stored);

        return buildAuthResponse(stored.getUser());
    }

    

    @Transactional
    public void logout(Long userId) {
        refreshRepo.revokeAllByUserId(userId);
        log.info("User {} logged out — all refresh tokens revoked", userId);
    }

    

    private AuthResponse buildAuthResponse(User user) {
        String accessToken  = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = createRefreshToken(user);
        UserResponse userDto = userMapper.toResponse(user);
        return AuthResponse.of(accessToken, refreshToken, accessTtl / 1000, userDto);
    }

    private String createRefreshToken(User user) {
        String raw = UUID.randomUUID().toString();
        refreshRepo.save(
                RefreshToken.builder()
                        .user(user)
                        .token(raw)
                        .expiresAt(Instant.now().plusMillis(refreshTtl))
                        .build()
        );
        return raw;
    }
}
