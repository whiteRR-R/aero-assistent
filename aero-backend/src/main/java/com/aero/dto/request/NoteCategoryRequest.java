package com.aero.dto.request;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record NoteCategoryRequest(
    @NotBlank @Size(max=100) String name,
    @Size(max=20) String color
) {}
