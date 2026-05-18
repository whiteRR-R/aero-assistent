package com.aero.security;

import com.aero.entity.User;
import com.aero.entity.RefreshToken;
import com.aero.repository.RefreshTokenRepository;
import com.aero.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService        jwtService;
    private final UserRepository    userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final RestClient        restClient = RestClient.builder().build();

    @Value("${aero.frontend.url}")
    private String frontendUrl;
    @Value("${aero.jwt.refresh-expiration}")
    private long refreshTtl;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest  request,
            HttpServletResponse response,
            Authentication      authentication
    ) throws IOException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauthUser = oauthToken.getPrincipal();
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        Map<String, Object> attrs = oauthUser.getAttributes();
        OAuth2AuthorizedClient authorizedClient =
                authorizedClientService.loadAuthorizedClient(registrationId, oauthToken.getName());
        String oauthAccessToken = authorizedClient != null && authorizedClient.getAccessToken() != null
                ? authorizedClient.getAccessToken().getTokenValue()
                : null;

        String email      = resolveEmail(registrationId, attrs, oauthAccessToken);
        String providerId = resolveProviderId(registrationId, attrs);
        String fullName   = (String) attrs.getOrDefault("name", email);
        String avatarUrl  = (String) attrs.get("picture");

        User user = userRepository.findByProviderAndProviderId(registrationId, providerId)
                .orElseGet(() -> userRepository.findByEmail(email).orElseGet(() -> User.builder()
                        .email(email)
                        .build()));

        user.setFullName(fullName);
        user.setAvatarUrl(avatarUrl);
        user.setProvider(registrationId);
        user.setProviderId(providerId);
        user.setEnabled(true);
        user = userRepository.save(user);

        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail());
        String refreshToken = createRefreshToken(user);

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                .queryParam("token", accessToken)
                .queryParam("refreshToken", refreshToken)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }



    private String resolveEmail(String provider, Map<String, Object> attrs, String oauthAccessToken) {
        String email = (String) attrs.get("email");
        if (email != null && !email.isBlank()) {
            return email;
        }

        if ("github".equalsIgnoreCase(provider) && oauthAccessToken != null && !oauthAccessToken.isBlank()) {
            Optional<String> ghEmail = fetchGithubEmail(oauthAccessToken);
            if (ghEmail.isPresent()) {
                return ghEmail.get();
            }

            Object login = attrs.get("login");
            if (login != null) {
                String fallback = login + "@users.noreply.github.com";
                log.warn("GitHub did not return email for login={}, using fallback {}", login, fallback);
                return fallback;
            }
        }

        throw new IllegalStateException("OAuth provider did not return email.");
    }

    private Optional<String> fetchGithubEmail(String accessToken) {
        try {
            List<Map<String, Object>> emails = restClient.get()
                    .uri("https://api.github.com/user/emails")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<Map<String, Object>>>() {});

            if (emails == null || emails.isEmpty()) {
                return Optional.empty();
            }

            return emails.stream()
                    .filter(e -> Boolean.TRUE.equals(e.get("verified")))
                    .sorted((a, b) -> Boolean.compare(
                            Boolean.TRUE.equals((Boolean) b.get("primary")),
                            Boolean.TRUE.equals((Boolean) a.get("primary"))
                    ))
                    .map(e -> Objects.toString(e.get("email"), null))
                    .filter(e -> e != null && !e.isBlank())
                    .findFirst();
        } catch (Exception ex) {
            log.warn("Failed to fetch GitHub email from /user/emails", ex);
            return Optional.empty();
        }
    }

    private String resolveProviderId(String provider, Map<String, Object> attrs) {
        Object id = attrs.get("sub");
        if (id == null) id = attrs.get("id");
        return id != null ? id.toString() : null;
    }

    private String createRefreshToken(User user) {
        String raw = UUID.randomUUID().toString();
        refreshTokenRepository.save(
                RefreshToken.builder()
                        .user(user)
                        .token(raw)
                        .expiresAt(Instant.now().plusMillis(refreshTtl))
                        .build()
        );
        return raw;
    }
}
