package com.aero.controller;

import com.aero.dto.request.LoginRequest;
import com.aero.dto.request.RefreshRequest;
import com.aero.dto.request.RegisterRequest;
import com.aero.dto.request.ResendVerificationRequest;
import com.aero.dto.response.AuthResponse;
import com.aero.dto.response.MessageResponse;
import com.aero.security.SecurityUtil;
import com.aero.service.impl.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, token refresh, logout")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new account")
    public MessageResponse register(@Valid @RequestBody RegisterRequest req) {
        return authService.register(req);
    }

    @GetMapping("/verify-email")
    @Operation(summary = "Verify email using token from email")
    public MessageResponse verifyEmail(@RequestParam String token) {
        return authService.verifyEmail(token);
    }

    @PostMapping("/resend-verification")
    @Operation(summary = "Resend verification email")
    public MessageResponse resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
        return authService.resendVerification(req.email());
    }

    @PostMapping("/login")
    @Operation(summary = "Login with email & password")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a refresh token for a new access token")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest req) {
        return authService.refresh(req.refreshToken());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke all refresh tokens (logout)")
    public void logout() {
        authService.logout(SecurityUtil.currentUserId());
    }
}
