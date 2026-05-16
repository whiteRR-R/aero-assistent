package com.aero.security;

import com.aero.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtil {

    private SecurityUtil() {}

    public static AeroPrincipal currentPrincipal() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AeroPrincipal principal)) {
            throw new UnauthorizedException("No authenticated user in context");
        }
        return principal;
    }

    public static Long currentUserId() {
        return currentPrincipal().getUserId();
    }
}
