package com.aero.security;

import com.aero.entity.User;
import com.aero.exception.BadRequestException;
import com.aero.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService        jwtService;
    private final UserRepository    userRepository;

    @Value("${aero.frontend.url}")
    private String frontendUrl;

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

        String email      = resolveEmail(registrationId, attrs);
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

        String redirectUrl = UriComponentsBuilder.fromUriString(frontendUrl + "/oauth2/callback")
                .queryParam("token", accessToken)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, redirectUrl);
    }



    private String resolveEmail(String provider, Map<String, Object> attrs) {
        String email = (String) attrs.get("email");
        if (email == null || email.isBlank()) {
            throw new BadRequestException("OAuth provider did not return email. Ensure GitHub scope includes user:email and email is available.");
        }
        return email;
    }

    private String resolveProviderId(String provider, Map<String, Object> attrs) {
        Object id = attrs.get("sub");
        if (id == null) id = attrs.get("id");
        return id != null ? id.toString() : null;
    }
}
