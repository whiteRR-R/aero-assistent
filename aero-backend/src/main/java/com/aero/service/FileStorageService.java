package com.aero.service;

import com.aero.util.FileUtil;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Service
@Slf4j
public class FileStorageService {

    @Value("${aero.upload.dir}")
    private String uploadDir;

    @Value("${server.servlet.context-path:/api}")
    private String contextPath;

    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(Paths.get(uploadDir));
        } catch (IOException e) {
            throw new RuntimeException("Cannot create upload directory: " + uploadDir, e);
        }
    }




    public String store(MultipartFile file, String subfolder) {
        FileUtil.validateImage(file);

        String filename  = FileUtil.generateFilename(file);
        Path   targetDir = Paths.get(uploadDir, subfolder);

        try {
            Files.createDirectories(targetDir);
            Path target = targetDir.resolve(filename);
            Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + filename, e);
        }


        return contextPath + "/uploads/" + subfolder + "/" + filename;
    }




    public void delete(String urlPath) {
        if (urlPath == null) return;
        String relative = urlPath.replace(contextPath + "/uploads/", "");
        Path   path     = Paths.get(uploadDir, relative);
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not delete file: {}", path, e);
        }
    }
}
