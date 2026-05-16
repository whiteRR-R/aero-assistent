package com.aero.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.security.Principal;





@Getter
@AllArgsConstructor
public class AeroPrincipal implements Principal {

    private final Long   userId;
    private final String email;

    @Override
    public String getName() {
        return email;
    }
}
