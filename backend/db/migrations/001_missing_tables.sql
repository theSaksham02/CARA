-- CARA Database Migration: Create missing tables in Supabase
-- Run this in Supabase Dashboard → SQL Editor → New Query → Run

-- ── readmission_records (missing) ─────────────────────────
CREATE TABLE IF NOT EXISTS readmission_records (
  id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  condition TEXT NOT NULL,
  risk_score REAL NOT NULL,
  risk_level TEXT NOT NULL,
  follow_up_date DATE NOT NULL,
  reason TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── sync_log (might be missing) ──────────────────────────
CREATE TABLE IF NOT EXISTS sync_log (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  synced_at TIMESTAMPTZ
);

-- ── audit_events (might be missing) ──────────────────────
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  method TEXT NOT NULL,
  route TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  actor_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes for performance ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_readmission_patient ON readmission_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_readmission_condition ON readmission_records(condition);
CREATE INDEX IF NOT EXISTS idx_readmission_risk ON readmission_records(risk_level);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_log(status);
CREATE INDEX IF NOT EXISTS idx_audit_route ON audit_events(route);
