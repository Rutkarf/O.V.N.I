-- Sessions démo partagées + jobs science + rôles étendus

ALTER TABLE app_users ALTER COLUMN role SET DEFAULT 'COLLAB';

CREATE TABLE IF NOT EXISTS demo_sessions (
    id              UUID PRIMARY KEY,
    owner_id        UUID REFERENCES app_users(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL DEFAULT 'session',
    seed            BIGINT,
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_demo_sessions_owner ON demo_sessions(owner_id);

-- type de job déjà VARCHAR : SCIENCE_DOSE / SCIENCE_LOT utilisés côté applicatif
COMMENT ON TABLE sim_jobs IS 'Jobs simulation vie + balayages science (SCIENCE_DOSE, SCIENCE_LOT, SIM_RUN)';
