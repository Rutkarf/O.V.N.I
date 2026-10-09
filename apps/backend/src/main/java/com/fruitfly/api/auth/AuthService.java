package com.fruitfly.api.auth;

import com.fruitfly.api.auth.AuthDtos.AuthResponse;
import com.fruitfly.api.auth.AuthDtos.LoginRequest;
import com.fruitfly.api.auth.AuthDtos.RegisterRequest;
import com.fruitfly.api.security.JwtService;
import com.fruitfly.api.security.UserPrincipal;
import com.fruitfly.api.user.AppUser;
import com.fruitfly.api.user.AppUserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

  private final AppUserRepository users;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;

  public AuthService(
      AppUserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
  }

  @Transactional
  public AuthResponse register(RegisterRequest request) {
    if (users.existsByEmailIgnoreCase(request.email())) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "email already registered");
    }
    AppUser user =
        new AppUser(
            request.email(),
            passwordEncoder.encode(request.password()),
            request.displayName().trim());
    users.save(user);
    return toResponse(user);
  }

  @Transactional(readOnly = true)
  public AuthResponse login(LoginRequest request) {
    AppUser user =
        users
            .findByEmailIgnoreCase(request.email())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "bad credentials"));
    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "bad credentials");
    }
    return toResponse(user);
  }

  private AuthResponse toResponse(AppUser user) {
    UserPrincipal principal = new UserPrincipal(user);
    String token = jwtService.issueToken(principal);
    return new AuthResponse(
        token, "Bearer", user.getEmail(), user.getDisplayName(), user.getId().toString());
  }
}
