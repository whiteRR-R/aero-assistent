package com.aero.util;

import com.aero.exception.BadRequestException;
import org.springframework.web.multipart.MultipartFile;
import java.util.Set;
import java.util.UUID;

public final class FileUtil {
    private FileUtil() {}
    private static final Set<String> ALLOWED = Set.of("image/jpeg","image/png","image/webp");
    public static void validateImage(MultipartFile file) {
        if (file.isEmpty()) throw new BadRequestException("File is empty");
        if (!ALLOWED.contains(file.getContentType()))
            throw new BadRequestException("Unsupported file type: " + file.getContentType());
        if (file.getSize() > 10 * 1024 * 1024)
            throw new BadRequestException("File exceeds 10 MB limit");
    }
    public static String generateFilename(MultipartFile file) {
        String ext = "";
        String original = file.getOriginalFilename();
        if (original != null && original.contains("."))
            ext = original.substring(original.lastIndexOf('.'));
        return UUID.randomUUID() + ext;
    }
}
