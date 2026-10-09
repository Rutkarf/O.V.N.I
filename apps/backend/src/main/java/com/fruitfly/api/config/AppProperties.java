package com.fruitfly.api.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "fruitfly")
public class AppProperties {

  private final Worker worker = new Worker();
  private final Cors cors = new Cors();
  private final Security security = new Security();
  private final Jobs jobs = new Jobs();

  public Worker getWorker() {
    return worker;
  }

  public Cors getCors() {
    return cors;
  }

  public Security getSecurity() {
    return security;
  }

  public Jobs getJobs() {
    return jobs;
  }

  public static class Worker {
    private String baseUrl = "http://127.0.0.1:8765";

    public String getBaseUrl() {
      return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
      this.baseUrl = baseUrl;
    }
  }

  public static class Cors {
    private List<String> allowedOrigins = new ArrayList<>(List.of("http://localhost:4200"));

    public List<String> getAllowedOrigins() {
      return allowedOrigins;
    }

    public void setAllowedOrigins(List<String> allowedOrigins) {
      this.allowedOrigins = allowedOrigins;
    }
  }

  public static class Security {
    /** false = accès ouvert. true = JWT obligatoire. */
    private boolean enabled = false;

    private String jwtSecret = "fruitfly-dev-secret-change-me-32chars-min!!";
    private long jwtExpirationMinutes = 720;
    private final Oidc oidc = new Oidc();

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getJwtSecret() {
      return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
      this.jwtSecret = jwtSecret;
    }

    public long getJwtExpirationMinutes() {
      return jwtExpirationMinutes;
    }

    public void setJwtExpirationMinutes(long jwtExpirationMinutes) {
      this.jwtExpirationMinutes = jwtExpirationMinutes;
    }

    public Oidc getOidc() {
      return oidc;
    }
  }

  public static class Oidc {
    private boolean enabled = false;
    private String issuerUri = "";
    private String clientId = "fruitfly";
    private String clientSecret = "";

    public boolean isEnabled() {
      return enabled;
    }

    public void setEnabled(boolean enabled) {
      this.enabled = enabled;
    }

    public String getIssuerUri() {
      return issuerUri;
    }

    public void setIssuerUri(String issuerUri) {
      this.issuerUri = issuerUri;
    }

    public String getClientId() {
      return clientId;
    }

    public void setClientId(String clientId) {
      this.clientId = clientId;
    }

    public String getClientSecret() {
      return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
      this.clientSecret = clientSecret;
    }
  }

  public static class Jobs {
    private long pollMs = 2000;
    private int maxAttempts = 3;

    public long getPollMs() {
      return pollMs;
    }

    public void setPollMs(long pollMs) {
      this.pollMs = pollMs;
    }

    public int getMaxAttempts() {
      return maxAttempts;
    }

    public void setMaxAttempts(int maxAttempts) {
      this.maxAttempts = maxAttempts;
    }
  }
}
