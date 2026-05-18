package com.aero.exception;

public class NotFoundException extends AeroException {
    public NotFoundException(String message) { super(message); }
    public static NotFoundException of(String entity, Long id) {
        return new NotFoundException(entity + " not found: id=" + id);
    }
}
