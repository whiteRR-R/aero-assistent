package com.aero.mapper;

import com.aero.dto.request.HabitRequest;
import com.aero.dto.response.HabitCompletionResponse;
import com.aero.dto.response.HabitResponse;
import com.aero.entity.Habit;
import com.aero.entity.HabitCompletion;
import org.mapstruct.*;

@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface HabitMapper {
    @Mapping(target = "currentStreak",    ignore = true)
    @Mapping(target = "longestStreak",    ignore = true)
    @Mapping(target = "totalCompletions", ignore = true)
    HabitResponse toResponse(Habit habit);
    HabitCompletionResponse toCompletionResponse(HabitCompletion completion);
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "completions", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Habit toEntity(HabitRequest request);
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "active", ignore = true)
    @Mapping(target = "completions", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateFromRequest(HabitRequest request, @MappingTarget Habit habit);
}
