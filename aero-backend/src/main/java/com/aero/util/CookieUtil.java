package com.aero.util;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
public final class CookieUtil {
    private CookieUtil() {}
    public static void addRefreshCookie(HttpServletResponse response, String token, int maxAgeSeconds) {
        Cookie cookie = new Cookie("refreshToken", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(maxAgeSeconds);
        response.addCookie(cookie);
    }
    public static void clearRefreshCookie(HttpServletResponse response) {
        Cookie cookie = new Cookie("refreshToken", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/api/auth/refresh");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }
}
