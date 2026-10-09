package com.fruitfly.api.config;

import com.fruitfly.api.user.AppUser;
import com.fruitfly.api.user.AppUserRepository;
import com.fruitfly.api.user.UserRole;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Compte labo par défaut pour auth P0 (changer le mot de passe en prod). */
@Component
public class SeedLabUser implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(SeedLabUser.class);

  private final AppUserRepository users;
  private final PasswordEncoder encoder;

  public SeedLabUser(AppUserRepository users, PasswordEncoder encoder) {
    this.users = users;
    this.encoder = encoder;
  }

  @Override
  public void run(ApplicationArguments args) {
    String email = "lab@luminy.local";
    if (users.existsByEmailIgnoreCase(email)) {
      return;
    }
    AppUser u = new AppUser(email, encoder.encode("motdepasse12"), "Lab Luminy");
    u.setRole(UserRole.PI);
    users.save(u);
    log.info("Compte seed créé : {} / motdepasse12 (rôle PI)", email);
  }
}
