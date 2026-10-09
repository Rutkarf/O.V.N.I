package com.fruitfly.api.auth;

import com.fruitfly.api.auth.AuthDtos.AuthResponse;
import com.fruitfly.api.auth.AuthDtos.LoginRequest;
import com.fruitfly.api.auth.AuthDtos.RegisterRequest;
import com.fruitfly.api.security.SecurityUtils;
import com.fruitfly.api.security.UserPrincipal;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  private final AuthService authService;

  public AuthController(AuthService authService) {
    this.authService = authService;
  }

  @PostMapping("/register")
  public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
    return authService.register(request);
  }

  @PostMapping("/login")
  public AuthResponse login(@Valid @RequestBody LoginRequest request) {
    return authService.login(request);
  }

  @GetMapping("/me")
  public Map<String, Object> me() {
    UserPrincipal principal = SecurityUtils.requirePrincipal();
    return Map.of(
        "userId", principal.getId().toString(),
        "email", principal.getUsername(),
        "displayName", principal.getDisplayName(),
        "role", principal.getRole().name());
  }
}
