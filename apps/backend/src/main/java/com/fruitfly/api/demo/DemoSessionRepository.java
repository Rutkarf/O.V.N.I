package com.fruitfly.api.demo;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DemoSessionRepository extends JpaRepository<DemoSessionEntity, UUID> {}
