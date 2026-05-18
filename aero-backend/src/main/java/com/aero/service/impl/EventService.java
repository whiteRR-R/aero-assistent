package com.aero.service.impl;

import com.aero.dto.request.EventRequest;
import com.aero.dto.response.EventResponse;
import com.aero.dto.response.PageResponse;
import com.aero.entity.Event;
import com.aero.entity.User;
import com.aero.exception.BadRequestException;
import com.aero.exception.NotFoundException;
import com.aero.mapper.EventMapper;
import com.aero.repository.EventRepository;
import com.aero.service.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventService {

    private final EventRepository    eventRepo;
    private final EventMapper        eventMapper;
    private final FileStorageService fileStorage;



    @Transactional
    public EventResponse create(Long userId, EventRequest req) {
        validateDates(req);
        Event event = eventMapper.toEntity(req);
        event.setUser(User.builder().id(userId).build());
        return eventMapper.toResponse(eventRepo.save(event));
    }



    @Transactional(readOnly = true)
    public EventResponse getById(Long userId, Long eventId) {
        return eventMapper.toResponse(findOwned(userId, eventId));
    }



    @Transactional(readOnly = true)
    public PageResponse<EventResponse> list(Long userId, int page, int size) {
        var p = eventRepo.findByUserId(
                userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "startTime")));
        return PageResponse.of(p.map(eventMapper::toResponse));
    }



    @Transactional(readOnly = true)
    public List<EventResponse> getByDateRange(Long userId, Instant from, Instant to) {
        if (from.isAfter(to)) throw new BadRequestException("'from' must be before 'to'");
        return eventRepo.findByUserIdAndDateRange(userId, from, to)
                .stream().map(eventMapper::toResponse).toList();
    }



    @Transactional
    public EventResponse update(Long userId, Long eventId, EventRequest req) {
        validateDates(req);
        Event event = findOwned(userId, eventId);
        eventMapper.updateFromRequest(req, event);
        return eventMapper.toResponse(eventRepo.save(event));
    }



    @Transactional
    public EventResponse uploadImage(Long userId, Long eventId, MultipartFile file) {
        Event event = findOwned(userId, eventId);
        if (event.getImageUrl() != null) fileStorage.delete(event.getImageUrl());
        event.setImageUrl(fileStorage.store(file, "events"));
        return eventMapper.toResponse(eventRepo.save(event));
    }



    @Transactional
    public void delete(Long userId, Long eventId) {
        Event event = findOwned(userId, eventId);
        if (event.getImageUrl() != null) fileStorage.delete(event.getImageUrl());
        eventRepo.delete(event);
    }



    private Event findOwned(Long userId, Long eventId) {
        return eventRepo.findByIdAndUserId(eventId, userId)
                .orElseThrow(() -> NotFoundException.of("Event", eventId));
    }

    private void validateDates(EventRequest req) {
        if (req.endTime() != null && req.startTime().isAfter(req.endTime())) {
            throw new BadRequestException("startTime must be before endTime");
        }
    }
}
