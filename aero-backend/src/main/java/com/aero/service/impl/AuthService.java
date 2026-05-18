package com.aero.service.impl;

import com.aero.dto.request.LoginRequest;
import com.aero.dto.request.RegisterRequest;
import com.aero.dto.response.AuthResponse;
import com.aero.dto.response.MessageResponse;
import com.aero.dto.response.UserResponse;
import com.aero.entity.EmailVerificationToken;
import com.aero.entity.RefreshToken;
import com.aero.entity.User;
import com.aero.exception.BadRequestException;
import com.aero.exception.ConflictException;
import com.aero.exception.UnauthorizedException;
import com.aero.mapper.UserMapper;
import com.aero.repository.EmailVerificationTokenRepository;
import com.aero.repository.RefreshTokenRepository;
import com.aero.repository.UserRepository;
import com.aero.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
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
    private final EmailVerificationTokenRepository verificationRepo;
    private final PasswordEncoder        encoder;
    private final JwtService             jwtService;
    private final UserMapper             userMapper;
    private final JavaMailSender         mailSender;

    @Value("${aero.jwt.expiration}")
    private long accessTtl;

    @Value("${aero.jwt.refresh-expiration}")
    private long refreshTtl;

    @Value("${aero.auth.verify-email-ttl-minutes:60}")
    private long verifyEmailTtlMinutes;

    @Value("${aero.backend.url:http://localhost:8080/api}")
    private String backendUrl;



    @Transactional
    public MessageResponse register(RegisterRequest req) {
        if (userRepo.existsByEmail(req.email())) {
            throw new ConflictException("Email already registered: " + req.email());
        }
        boolean mailConfigured = isMailConfigured();

        User user = User.builder()
                .email(req.email())
                .passwordHash(encoder.encode(req.password()))
                .fullName(req.fullName())
                .enabled(!mailConfigured)
                .provider("local")
                .build();

        userRepo.save(user);
        if (mailConfigured) {
            createAndSendVerificationToken(user);
            log.info("New user registered (email verification pending): {}", user.getEmail());
            return new MessageResponse("Registration successful. Please verify your email.");
        }

        log.info("New user registered (auto-enabled, mail is not configured): {}", user.getEmail());
        return new MessageResponse("Registration successful.");
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
            if (!isMailConfigured()) {
                user.setEnabled(true);
                userRepo.save(user);
            } else {
                throw new UnauthorizedException("Account is disabled. Verify your email first.");
            }
        }

        return buildAuthResponse(user);
    }

    @Transactional
    public MessageResponse verifyEmail(String token) {
        EmailVerificationToken vt = verificationRepo.findByTokenAndUsedAtIsNull(token)
                .orElseThrow(() -> new BadRequestException("Invalid verification token"));

        if (vt.getExpiresAt().isBefore(Instant.now())) {
            throw new BadRequestException("Verification token has expired");
        }

        vt.setUsedAt(Instant.now());
        User user = vt.getUser();
        user.setEnabled(true);

        verificationRepo.save(vt);
        userRepo.save(user);

        return new MessageResponse("Email verified successfully. You can now log in.");
    }

    @Transactional
    public MessageResponse resendVerification(String email) {
        userRepo.findByEmail(email).ifPresent(user -> {
            if (!Boolean.TRUE.equals(user.getEnabled()) && "local".equalsIgnoreCase(user.getProvider())) {
                createAndSendVerificationToken(user);
            }
        });
        return new MessageResponse("If the account exists, a verification email has been sent.");
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

    private void createAndSendVerificationToken(User user) {
        String token = UUID.randomUUID().toString().replace("-", "");
        verificationRepo.save(
                EmailVerificationToken.builder()
                        .user(user)
                        .token(token)
                        .expiresAt(Instant.now().plusSeconds(verifyEmailTtlMinutes * 60))
                        .build()
        );
        sendVerificationEmail(user.getEmail(), token);
    }

    private void sendVerificationEmail(String email, String token) {
        String verifyUrl = backendUrl + "/auth/verify-email?token=" + token;
        if (!isMailConfigured()) {
            log.warn("Mail is not configured. Verification link for {}: {}", email, verifyUrl);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Verify your AERO account");
            message.setText("Click the link to verify your email:\n" + verifyUrl);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send verification email to {}. Link: {}", email, verifyUrl, ex);
        }
    }

    private boolean isMailConfigured() {
        return !(mailSender instanceof JavaMailSenderImpl impl)
                || (impl.getUsername() != null && !impl.getUsername().isBlank());
    }
}
