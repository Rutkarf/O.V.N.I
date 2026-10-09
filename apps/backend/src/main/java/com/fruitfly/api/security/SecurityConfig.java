package com.fruitfly.api.security;

import com.fruitfly.api.config.AppProperties;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
      throws Exception {
    return configuration.getAuthenticationManager();
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(properties.getCors().getAllowedOrigins());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  @Bean
  SecurityFilterChain securityFilterChain(
      HttpSecurity http, JwtAuthFilter jwtAuthFilter, AppProperties properties) throws Exception {
    boolean authOn = properties.getSecurity().isEnabled();

    http.csrf(csrf -> csrf.disable())
        .cors(Customizer.withDefaults())
        .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS));

    if (!authOn) {
      // Démo ouverte — JWT reste branché, non exigé.
      http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
    } else {
      http.authorizeHttpRequests(
              auth ->
                  auth.requestMatchers("/actuator/health", "/actuator/info")
                      .permitAll()
                      .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login")
                      .permitAll()
                      .requestMatchers(HttpMethod.OPTIONS, "/**")
                      .permitAll()
                      // Lecteur : lecture science / sessions
                      .requestMatchers(HttpMethod.GET, "/api/v1/science/**", "/api/v1/sessions/**")
                      .hasAnyRole("VIEWER", "COLLAB", "PI", "USER", "ADMIN")
                      // Écriture science / jobs : collab+
                      .requestMatchers(HttpMethod.POST, "/api/v1/science/**", "/api/v1/jobs/**", "/api/v1/sessions/**")
                      .hasAnyRole("COLLAB", "PI", "USER", "ADMIN")
                      .anyRequest()
                      .authenticated())
          .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
    }
    return http.build();
  }
}
