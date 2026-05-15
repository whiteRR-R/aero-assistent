package com.aero.mapper;
import com.aero.dto.request.ReminderRequest;
import com.aero.dto.response.ReminderResponse;
import com.aero.entity.Reminder;
import org.mapstruct.*;
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface ReminderMapper {
    ReminderResponse toResponse(Reminder reminder);
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "status", ignore = true)
    @Mapping(target = "sentAt", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    Reminder toEntity(ReminderRequest request);
}
