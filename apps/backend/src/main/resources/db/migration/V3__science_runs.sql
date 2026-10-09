-- Essais science centralisés + sessions démo persistées (déjà créées en V2, index utiles)

CREATE TABLE IF NOT EXISTS science_runs (
    id              UUID PRIMARY KEY,
    run_id          VARCHAR(64)  NOT NULL UNIQUE,
    owner_id        UUID REFERENCES app_users(id) ON DELETE SET NULL,
    motif_id        VARCHAR(120),
    circuit_id      VARCHAR(120),
    action          VARCHAR(32),
    seed            BIGINT,
    dataset_hash    VARCHAR(64),
    adapters_hash   VARCHAR(64),
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_science_runs_created ON science_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_science_runs_owner ON science_runs(owner_id);
CREATE INDEX IF NOT EXISTS idx_science_runs_motif ON science_runs(motif_id);

CREATE TABLE IF NOT EXISTS genetic_maps (
    id              UUID PRIMARY KEY,
    owner_id        UUID REFERENCES app_users(id) ON DELETE SET NULL,
    motif_id        VARCHAR(120),
    ligne           VARCHAR(200),
    driver          VARCHAR(120),
    outil           VARCHAR(120),
    payload         JSONB NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
