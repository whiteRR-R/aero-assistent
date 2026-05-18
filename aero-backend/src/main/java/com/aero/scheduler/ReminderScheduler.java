package com.aero.scheduler;

import com.aero.service.impl.ReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ReminderScheduler {

    private final ReminderService reminderService;





    @Scheduled(fixedDelay = 60_000, initialDelay = 10_000)
    public void processReminders() {
        log.debug("ReminderScheduler: checking due reminders...");
        reminderService.processDueReminders();
    }
}
