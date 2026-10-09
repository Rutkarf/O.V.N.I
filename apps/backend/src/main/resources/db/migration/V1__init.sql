CREATE TABLE app_users (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(120) NOT NULL,
    role            VARCHAR(32)  NOT NULL DEFAULT 'USER',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE organisms (
    id              UUID PRIMARY KEY,
    owner_id        UUID         NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    name            VARCHAR(120) NOT NULL,
    species         VARCHAR(120) NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'draft',
    dna_profile     JSONB,
    neural_graph    JSONB,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organisms_owner ON organisms(owner_id);

CREATE TABLE sim_jobs (
    id              UUID PRIMARY KEY,
    owner_id        UUID         NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    organism_id     UUID         REFERENCES organisms(id) ON DELETE SET NULL,
    type            VARCHAR(64)  NOT NULL,
    status          VARCHAR(32)  NOT NULL DEFAULT 'PENDING',
    mode            VARCHAR(32)  NOT NULL DEFAULT 'rules',
    ticks           INT          NOT NULL DEFAULT 8,
    seed            BIGINT,
    attempt_count   INT          NOT NULL DEFAULT 0,
    payload         JSONB,
    result          JSONB,
    error_message   TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    finished_at     TIMESTAMPTZ
);

CREATE INDEX idx_sim_jobs_status_created ON sim_jobs(status, created_at);
CREATE INDEX idx_sim_jobs_owner ON sim_jobs(owner_id);
