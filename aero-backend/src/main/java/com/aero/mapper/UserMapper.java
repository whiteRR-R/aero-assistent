package com.aero.mapper;
import com.aero.dto.response.UserResponse;
import com.aero.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingConstants;
@Mapper(componentModel = MappingConstants.ComponentModel.SPRING)
public interface UserMapper {
    UserResponse toResponse(User user);
}
