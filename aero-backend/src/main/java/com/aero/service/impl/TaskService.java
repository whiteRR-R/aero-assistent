package com.aero.service.impl;

import com.aero.dto.request.TaskRequest;
import com.aero.dto.response.PageResponse;
import com.aero.dto.response.TaskResponse;
import com.aero.dto.response.TaskStatsResponse;
import com.aero.entity.Task;
import com.aero.entity.User;
import com.aero.enums.TaskPriority;
import com.aero.enums.TaskStatus;
import com.aero.exception.NotFoundException;
import com.aero.mapper.TaskMapper;
import com.aero.repository.TaskRepository;
import com.aero.service.FileStorageService;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskRepository     taskRepo;
    private final TaskMapper         taskMapper;
    private final FileStorageService fileStorage;



    @Transactional
    public TaskResponse create(Long userId, TaskRequest req) {
        Task task = taskMapper.toEntity(req);
        task.setUser(User.builder().id(userId).build());
        return taskMapper.toResponse(taskRepo.save(task));
    }



    @Transactional(readOnly = true)
    public TaskResponse getById(Long userId, Long taskId) {
        return taskMapper.toResponse(findOwned(userId, taskId));
    }






    @Transactional(readOnly = true)
    public PageResponse<TaskResponse> list(
            Long userId, TaskStatus status, TaskPriority priority,
            Instant from, Instant to, int page, int size, String sort) {

        Pageable pageable = PageRequest.of(page, size, parseSort(sort));
        Specification<Task> spec = buildSpec(userId, status, priority, from, to);
        return PageResponse.of(taskRepo.findAll(spec, pageable).map(taskMapper::toResponse));
    }

    private Specification<Task> buildSpec(Long userId, TaskStatus status,
                                          TaskPriority priority, Instant from, Instant to) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("user").get("id"), userId));
            if (status   != null) predicates.add(cb.equal(root.get("status"),   status));
            if (priority != null) predicates.add(cb.equal(root.get("priority"), priority));
            if (from     != null) predicates.add(cb.greaterThanOrEqualTo(root.get("deadline"), from));
            if (to       != null) predicates.add(cb.lessThanOrEqualTo(root.get("deadline"),    to));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }



    @Transactional(readOnly = true)
    public List<TaskResponse> upcoming(Long userId, int days) {
        Instant now = Instant.now();
        Instant end = now.plus(days, ChronoUnit.DAYS);
        return taskRepo.findUpcoming(userId, now, end).stream()
                .map(taskMapper::toResponse).toList();
    }



    @Transactional
    public TaskResponse update(Long userId, Long taskId, TaskRequest req) {
        Task task = findOwned(userId, taskId);
        taskMapper.updateFromRequest(req, task);

        if (req.status() == TaskStatus.DONE && task.getCompletedAt() == null) {
            task.setCompletedAt(Instant.now());
        } else if (req.status() != null && req.status() != TaskStatus.DONE) {
            task.setCompletedAt(null);
        }

        return taskMapper.toResponse(taskRepo.save(task));
    }



    @Transactional
    public TaskResponse uploadImage(Long userId, Long taskId, MultipartFile file) {
        Task task = findOwned(userId, taskId);
        if (task.getImageUrl() != null) fileStorage.delete(task.getImageUrl());
        task.setImageUrl(fileStorage.store(file, "tasks"));
        return taskMapper.toResponse(taskRepo.save(task));
    }



    @Transactional
    public void delete(Long userId, Long taskId) {
        Task task = findOwned(userId, taskId);
        if (task.getImageUrl() != null) fileStorage.delete(task.getImageUrl());
        taskRepo.delete(task);
    }



    @Transactional(readOnly = true)
    public TaskStatsResponse stats(Long userId) {
        long total      = taskRepo.countByUserId(userId);
        long todo       = taskRepo.countByUserIdAndStatus(userId, TaskStatus.TODO);
        long inProgress = taskRepo.countByUserIdAndStatus(userId, TaskStatus.IN_PROGRESS);
        long done       = taskRepo.countByUserIdAndStatus(userId, TaskStatus.DONE);
        long cancelled  = taskRepo.countByUserIdAndStatus(userId, TaskStatus.CANCELLED);
        long overdue    = taskRepo.findUpcoming(userId, Instant.EPOCH, Instant.now())
                .stream()
                .filter(t -> t.getStatus() != TaskStatus.DONE &&
                             t.getStatus() != TaskStatus.CANCELLED)
                .count();

        return new TaskStatsResponse(total, todo, inProgress, done, cancelled, overdue);
    }



    private Task findOwned(Long userId, Long taskId) {
        return taskRepo.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> NotFoundException.of("Task", taskId));
    }

    private Sort parseSort(String sort) {
        if (sort == null) return Sort.by(Sort.Direction.DESC, "createdAt");
        return switch (sort) {
            case "deadline"      -> Sort.by(Sort.Direction.ASC,  "deadline");
            case "priority"      -> Sort.by(Sort.Direction.DESC, "priority");
            case "createdAt_asc" -> Sort.by(Sort.Direction.ASC,  "createdAt");
            default              -> Sort.by(Sort.Direction.DESC, "createdAt");
        };
    }
}
