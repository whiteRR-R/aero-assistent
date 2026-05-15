package com.aero.mapper;
import com.aero.dto.request.NoteRequest;
import com.aero.dto.response.NoteCategoryResponse;
import com.aero.dto.response.NoteResponse;
import com.aero.entity.Note;
import com.aero.entity.NoteCategory;
import org.mapstruct.*;
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface NoteMapper {
    NoteResponse toResponse(Note note);
    NoteCategoryResponse toCategoryResponse(NoteCategory category);
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Note toEntity(NoteRequest request);
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "user", ignore = true)
    @Mapping(target = "category", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateFromRequest(NoteRequest request, @MappingTarget Note note);
}
