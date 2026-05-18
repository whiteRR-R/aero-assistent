package com.aero.service.impl;

import com.aero.dto.request.NotificationPrefRequest;
import com.aero.dto.request.ReminderRequest;
import com.aero.dto.response.NotificationPrefResponse;
import com.aero.dto.response.PageResponse;
import com.aero.dto.response.ReminderResponse;
import com.aero.entity.NotificationPreference;
import com.aero.entity.Reminder;
import com.aero.entity.User;
import com.aero.enums.ReminderStatus;
import com.aero.exception.NotFoundException;
import com.aero.mapper.ReminderMapper;
import com.aero.repository.NotificationPreferenceRepository;
import com.aero.repository.ReminderRepository;
import jakarta.mail.MessagingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReminderService {

    private final ReminderRepository             reminderRepo;
    private final NotificationPreferenceRepository prefRepo;
    private final ReminderMapper                 reminderMapper;
    private final JavaMailSender                 mailSender;



    @Transactional
    public ReminderResponse create(Long userId, ReminderRequest req) {
        Reminder reminder = reminderMapper.toEntity(req);
        reminder.setUser(User.builder().id(userId).build());
        return reminderMapper.toResponse(reminderRepo.save(reminder));
    }

    @Transactional(readOnly = true)
    public ReminderResponse getById(Long userId, Long reminderId) {
        return reminderMapper.toResponse(findOwned(userId, reminderId));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReminderResponse> list(Long userId, int page, int size) {
        var p = reminderRepo.findByUserId(userId,
                PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "remindAt")));
        return PageResponse.of(p.map(reminderMapper::toResponse));
    }

    @Transactional
    public ReminderResponse update(Long userId, Long reminderId, ReminderRequest req) {
        Reminder r = findOwned(userId, reminderId);
        r.setTitle(req.title());
        r.setMessage(req.message());
        r.setRefType(req.refType());
        r.setRefId(req.refId());
        r.setRemindAt(req.remindAt());
        r.setStatus(ReminderStatus.PENDING);
        r.setSentAt(null);
        return reminderMapper.toResponse(reminderRepo.save(r));
    }

    @Transactional
    public void cancel(Long userId, Long reminderId) {
        Reminder r = findOwned(userId, reminderId);
        r.setStatus(ReminderStatus.CANCELLED);
        reminderRepo.save(r);
    }

    @Transactional
    public void delete(Long userId, Long reminderId) {
        reminderRepo.delete(findOwned(userId, reminderId));
    }



    @Transactional(readOnly = true)
    public NotificationPrefResponse getPreferences(Long userId) {
        NotificationPreference pref = prefRepo.findById(userId)
                .orElse(defaultPreferences(userId));
        return toResponse(pref);
    }

    @Transactional
    public NotificationPrefResponse updatePreferences(Long userId, NotificationPrefRequest req) {
        NotificationPreference pref = prefRepo.findById(userId)
                .orElse(defaultPreferences(userId));

        if (req.emailEnabled()    != null) pref.setEmailEnabled(req.emailEnabled());
        if (req.pushEnabled()     != null) pref.setPushEnabled(req.pushEnabled());
        if (req.dailyDigest()     != null) pref.setDailyDigest(req.dailyDigest());
        if (req.digestTime()      != null) pref.setDigestTime(req.digestTime());
        if (req.reminderMinutes() != null) {
            pref.setReminderMinutes(
                    req.reminderMinutes().stream().mapToInt(i -> i).toArray());
        }

        return toResponse(prefRepo.save(pref));
    }







    @Transactional
    public void processDueReminders() {
        List<Reminder> due = reminderRepo.findDueReminders(Instant.now());
        for (Reminder r : due) {
            try {
                sendEmail(r);
                reminderRepo.updateStatus(r.getId(), ReminderStatus.SENT, Instant.now());
            } catch (Exception e) {
                log.error("Failed to send reminder id={}: {}", r.getId(), e.getMessage());
                reminderRepo.updateStatus(r.getId(), ReminderStatus.FAILED, null);
            }
        }
    }



    private void sendEmail(Reminder r) {
        NotificationPreference pref = prefRepo.findById(r.getUser().getId()).orElse(null);
        if (pref != null && !pref.getEmailEnabled()) return;

        String localeTag = r.getUser().getLocale() != null ? r.getUser().getLocale() : "en";
        String lang = localeTag.toLowerCase(Locale.ROOT).startsWith("ru")
                ? "ru"
                : localeTag.toLowerCase(Locale.ROOT).startsWith("kk") ? "kk" : "en";

        try {
            var mime = mailSender.createMimeMessage();
            var helper = new MimeMessageHelper(mime, "UTF-8");
            helper.setTo(r.getUser().getEmail());
            helper.setSubject(switch (lang) {
                case "ru" -> "AERO Напоминание: " + r.getTitle();
                case "kk" -> "AERO Еске салғыш: " + r.getTitle();
                default -> "AERO Reminder: " + r.getTitle();
            });
            helper.setText(buildReminderHtml(r), true);
            mailSender.send(mime);
        } catch (MessagingException e) {
            throw new RuntimeException("Failed to build reminder email", e);
        }
        log.info("Reminder email sent to {} for reminder id={}", r.getUser().getEmail(), r.getId());
    }

    private String buildReminderHtml(Reminder r) {
        String localeTag = r.getUser().getLocale() != null ? r.getUser().getLocale() : "en";
        Locale locale = Locale.forLanguageTag(localeTag);
        String lang = localeTag.toLowerCase(Locale.ROOT).startsWith("ru")
                ? "ru"
                : localeTag.toLowerCase(Locale.ROOT).startsWith("kk") ? "kk" : "en";
        String tz = (r.getUser().getTimezone() == null || r.getUser().getTimezone().isBlank())
                ? "UTC" : r.getUser().getTimezone();

        String remindAt = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm z", locale)
                .withZone(ZoneId.of(tz))
                .format(r.getRemindAt());

        String title = escapeHtml(r.getTitle());
        String message = escapeHtml(r.getMessage() != null && !r.getMessage().isBlank() ? r.getMessage() : r.getTitle());
        String type = switch (r.getRefType().name()) {
            case "TASK" -> lang.equals("ru") ? "Задача" : lang.equals("kk") ? "Тапсырма" : "Task";
            case "EVENT" -> lang.equals("ru") ? "Событие" : lang.equals("kk") ? "Оқиға" : "Event";
            case "HABIT" -> lang.equals("ru") ? "Привычка" : lang.equals("kk") ? "Әдет" : "Habit";
            default -> lang.equals("ru") ? "Другое" : lang.equals("kk") ? "Басқа" : "Custom";
        };
        String subjectTitle = lang.equals("ru") ? "Напоминание" : lang.equals("kk") ? "Еске салғыш" : "Reminder";
        String subjectSub = lang.equals("ru")
                ? "Мягкое напоминание о важном"
                : lang.equals("kk")
                    ? "Маңызды іс туралы жұмсақ еске салу"
                    : "A gentle nudge for what matters today";
        String typeLabel = lang.equals("ru") ? "Тип" : lang.equals("kk") ? "Түрі" : "Type";
        String timeLabel = lang.equals("ru") ? "Время" : lang.equals("kk") ? "Уақыты" : "Time";
        String footer = lang.equals("ru")
                ? "Это напоминание отправлено системой уведомлений AERO."
                : lang.equals("kk")
                    ? "Бұл еске салғыш AERO хабарландыру жүйесі арқылы жіберілді."
                    : "This reminder was sent by AERO notifications.";
        String brandLine = lang.equals("ru")
                ? "AERO • Премиальные напоминания о продуктивности"
                : lang.equals("kk")
                    ? "AERO • Өнімділікке арналған премиум еске салғыштар"
                    : "AERO • Premium productivity reminders";

        return """
                <!doctype html>
                <html>
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>AERO %s</title>
                </head>
                <body style="margin:0;padding:0;background:#f8f5ef;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1f2937;">
                  <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="padding:28px 12px;">
                    <tr>
                      <td align="center">
                        <table role="presentation" width="620" cellpadding="0" cellspacing="0"
                               style="max-width:620px;width:100%%;background:#ffffff;border:1px solid #eadfce;border-radius:14px;overflow:hidden;
                                      box-shadow:0 8px 24px rgba(120,87,43,.08);">
                          <tr>
                            <td style="padding:0;">
                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"
                                     style="background:linear-gradient(135deg,#b45309 0%%,#d97706 100%%);">
                                <tr>
                                  <td style="padding:24px 24px 18px 24px;">
                                    <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#ffedd5;font-weight:700;">AERO</div>
                                    <div style="font-size:24px;font-weight:800;margin-top:8px;color:#ffffff;line-height:1.2;">%s</div>
                                    <div style="margin-top:10px;font-size:13px;color:#ffedd5;">%s</div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:24px;">
                              <div style="font-size:22px;font-weight:700;line-height:1.35;color:#1f2937;">%s</div>
                              <div style="margin-top:14px;padding:14px 16px;background:#fffbf5;border:1px solid #f3e4cf;border-radius:10px;
                                          font-size:14px;line-height:1.75;color:#374151;">%s</div>

                              <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#fffdfa;border:1px solid #f1e7d8;border-radius:10px;">
                                <tr>
                                  <td style="font-size:12px;color:#6b7280;padding:12px 14px 6px 14px;">%s</td>
                                  <td align="right" style="font-size:12px;color:#1f2937;font-weight:700;padding:12px 14px 6px 14px;">
                                    <span style="display:inline-block;background:#fff3e0;color:#92400e;padding:4px 10px;border-radius:999px;border:1px solid #f3d2a2;">%s</span>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="font-size:12px;color:#6b7280;padding:6px 14px 12px 14px;">%s</td>
                                  <td align="right" style="font-size:12px;color:#1f2937;font-weight:700;padding:6px 14px 12px 14px;">%s</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:16px 24px;border-top:1px solid #f1e7d8;background:#fffbf5;
                                       font-size:12px;color:#6b7280;line-height:1.6;">
                              %s
                            </td>
                          </tr>
                        </table>
                        <div style="font-size:11px;color:#a78b6d;margin-top:10px;">%s</div>
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """.formatted(subjectTitle, subjectTitle, subjectSub, title, message, typeLabel, escapeHtml(type), timeLabel, remindAt, footer, brandLine);
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private Reminder findOwned(Long userId, Long reminderId) {
        return reminderRepo.findByIdAndUserId(reminderId, userId)
                .orElseThrow(() -> NotFoundException.of("Reminder", reminderId));
    }

    private NotificationPreference defaultPreferences(Long userId) {
        return NotificationPreference.builder()
                .userId(userId)
                .user(User.builder().id(userId).build())
                .build();
    }

    private NotificationPrefResponse toResponse(NotificationPreference p) {
        int[] arr = p.getReminderMinutes();
        List<Integer> minutes = (arr != null)
                ? java.util.Arrays.stream(arr).boxed().toList()
                : List.of(15, 60);
        return new NotificationPrefResponse(
                p.getEmailEnabled(), p.getPushEnabled(),
                minutes, p.getDailyDigest(), p.getDigestTime());
    }
}
