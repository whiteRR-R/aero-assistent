package com.aero.service.impl;

import com.aero.entity.CalendarIntegration;
import com.aero.entity.Event;
import com.aero.entity.User;
import com.aero.exception.BadRequestException;
import com.aero.exception.NotFoundException;
import com.aero.repository.CalendarIntegrationRepository;
import com.aero.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import net.fortuna.ical4j.data.CalendarOutputter;
import net.fortuna.ical4j.model.Calendar;
import net.fortuna.ical4j.model.DateTime;
import net.fortuna.ical4j.model.component.VEvent;
import net.fortuna.ical4j.model.property.*;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CalendarService {

    private final CalendarIntegrationRepository integrationRepo;
    private final EventRepository               eventRepo;

    

    



    public byte[] exportIcal(Long userId) {
        List<Event> events = eventRepo.findByUserId(
                userId, org.springframework.data.domain.Pageable.unpaged()
        ).getContent();

        Calendar calendar = new Calendar();
        calendar.getProperties().add(new ProdId("-//AERO Personal Assistant//EN"));
        calendar.getProperties().add(Version.VERSION_2_0);
        calendar.getProperties().add(CalScale.GREGORIAN);

        for (Event e : events) {
            VEvent vEvent = buildVEvent(e);
            calendar.getComponents().add(vEvent);
        }

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try {
            new CalendarOutputter().output(calendar, out);
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate iCal output", ex);
        }
        return out.toByteArray();
    }

    

    



    @Transactional
    public void connectGoogleCalendar(Long userId, String accessToken,
                                       String refreshToken, Instant tokenExpires,
                                       String calendarId) {
        CalendarIntegration integration = integrationRepo
                .findByUserIdAndProvider(userId, "google")
                .orElse(CalendarIntegration.builder()
                        .user(User.builder().id(userId).build())
                        .provider("google")
                        .build());

        integration.setAccessToken(accessToken);
        integration.setRefreshToken(refreshToken);
        integration.setTokenExpires(tokenExpires);
        integration.setCalendarId(calendarId != null ? calendarId : "primary");

        integrationRepo.save(integration);
        log.info("Google Calendar connected for user {}", userId);
    }

    @Transactional
    public void disconnectGoogleCalendar(Long userId) {
        integrationRepo.findByUserIdAndProvider(userId, "google")
                .ifPresent(integrationRepo::delete);
        log.info("Google Calendar disconnected for user {}", userId);
    }

    @Transactional(readOnly = true)
    public boolean isGoogleConnected(Long userId) {
        return integrationRepo.findByUserIdAndProvider(userId, "google").isPresent();
    }

    




    @Async("taskExecutor")
    @Transactional
    public void syncFromGoogle(Long userId) {
        CalendarIntegration integration = integrationRepo
                .findByUserIdAndProvider(userId, "google")
                .orElseThrow(() -> new BadRequestException("Google Calendar not connected"));

        if (integration.getTokenExpires() != null &&
            integration.getTokenExpires().isBefore(Instant.now())) {
            log.warn("Google Calendar access token expired for user {}", userId);
            
            return;
        }

        
        
        
        
        

        integration.setLastSyncedAt(Instant.now());
        integrationRepo.save(integration);
        log.info("Google Calendar sync completed for user {}", userId);
    }

    

    private VEvent buildVEvent(Event e) {
        Date start = Date.from(e.getStartTime());
        VEvent vEvent = (e.getEndTime() != null)
                ? new VEvent(new DateTime(start), new DateTime(Date.from(e.getEndTime())), e.getTitle())
                : new VEvent(new DateTime(start), e.getTitle());

        vEvent.getProperties().add(new Uid(
                "aero-event-" + e.getId() + "@aero-app.io"));

        if (e.getDescription() != null) {
            vEvent.getProperties().add(new Description(e.getDescription()));
        }
        if (e.getLocation() != null) {
            vEvent.getProperties().add(new Location(e.getLocation()));
        }
        if (e.getRecurrence() != null) {
            try {
                vEvent.getProperties().add(new RRule(e.getRecurrence()));
            } catch (java.text.ParseException ex) {
                log.warn("Invalid RRULE for event {}: {}", e.getId(), e.getRecurrence());
            }
        }

        vEvent.getProperties().add(new DtStamp(new DateTime(Date.from(e.getUpdatedAt()))));

        return vEvent;
    }
}
