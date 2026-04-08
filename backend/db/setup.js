'use strict';

const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');

const store = {
  pool: null,
  bootstrapped: false,
  memory: {
    patients: [],
    triageAssessments: [],
    soapNotes: [],
    followups: [],
    auditEvents: [],
  },
};

const schemaSql = `
  CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    age_months INTEGER NOT NULL CHECK (age_months >= 0),
    caregiver_name TEXT,
    sex TEXT,
    village TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS triage_assessments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
    symptoms JSONB NOT NULL DEFAULT '[]'::jsonb,
    age_months INTEGER NOT NULL CHECK (age_months >= 0),
    urgency TEXT NOT NULL,
    reason TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    matched_rule_id TEXT,
    transcript TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS soap_notes (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
    transcript TEXT NOT NULL,
    subjective JSONB NOT NULL DEFAULT '[]'::jsonb,
    objective JSONB NOT NULL DEFAULT '[]'::jsonb,
    assessment JSONB NOT NULL DEFAULT '[]'::jsonb,
    plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS followups (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled',
    instructions TEXT NOT NULL,
    urgency TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

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
`;

function getDbMode() {
  if (process.env.DB_DRIVER) {
    return process.env.DB_DRIVER;
  }

  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ? 'postgres' : 'memory';
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
}

function createPool() {
  if (store.pool) {
    return store.pool;
  }

  const connectionString = getDatabaseUrl();
  if (!connectionString) {
    throw new Error('Supabase Postgres connection string is missing. Set DATABASE_URL or SUPABASE_DB_URL.');
  }

  store.pool = new Pool({
    connectionString,
    ssl: process.env.DB_SSL === 'disable' ? false : { rejectUnauthorized: false },
  });

  return store.pool;
}

async function bootstrapDatabase() {
  if (store.bootstrapped) {
    return { mode: getDbMode() };
  }

  if (getDbMode() === 'memory') {
    store.bootstrapped = true;
    return { mode: 'memory' };
  }

  const pool = createPool();
  await pool.query(schemaSql);
  store.bootstrapped = true;
  return { mode: 'postgres' };
}

async function closeDatabase() {
  if (store.pool) {
    await store.pool.end();
    store.pool = null;
  }

  store.bootstrapped = false;
}

function resetMemoryDatabase() {
  store.memory = {
    patients: [],
    triageAssessments: [],
    soapNotes: [],
    followups: [],
    auditEvents: [],
  };
}

function withTimestamps(record) {
  return {
    ...record,
    created_at: new Date().toISOString(),
  };
}

async function listPatients() {
  if (getDbMode() === 'memory') {
    return [...store.memory.patients].sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  const pool = createPool();
  const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
  return result.rows;
}

async function findPatientById(patientId) {
  if (getDbMode() === 'memory') {
    return store.memory.patients.find((patient) => patient.id === patientId) || null;
  }

  const pool = createPool();
  const result = await pool.query('SELECT * FROM patients WHERE id = $1 LIMIT 1', [patientId]);
  return result.rows[0] || null;
}

async function createPatient(payload, actorId) {
  const patient = withTimestamps({
    id: payload.id || randomUUID(),
    full_name: payload.full_name,
    age_months: Number(payload.age_months),
    caregiver_name: payload.caregiver_name || null,
    sex: payload.sex || null,
    village: payload.village || null,
    created_by: actorId || null,
  });

  if (getDbMode() === 'memory') {
    store.memory.patients.push(patient);
    return patient;
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO patients (id, full_name, age_months, caregiver_name, sex, village, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      patient.id,
      patient.full_name,
      patient.age_months,
      patient.caregiver_name,
      patient.sex,
      patient.village,
      patient.created_by,
      patient.created_at,
    ]
  );

  return result.rows[0];
}

async function createTriageAssessment(payload, actorId) {
  const assessment = withTimestamps({
    id: payload.id || randomUUID(),
    patient_id: payload.patient_id || null,
    symptoms: payload.symptoms || [],
    age_months: Number(payload.age_months),
    urgency: payload.urgency,
    reason: payload.reason,
    recommended_action: payload.recommended_action,
    matched_rule_id: payload.matched_rule_id || null,
    transcript: payload.transcript || null,
    metadata: payload.metadata || {},
    created_by: actorId || null,
  });

  if (getDbMode() === 'memory') {
    store.memory.triageAssessments.push(assessment);
    return assessment;
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO triage_assessments (
      id, patient_id, symptoms, age_months, urgency, reason, recommended_action, matched_rule_id, transcript, metadata, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *`,
    [
      assessment.id,
      assessment.patient_id,
      assessment.symptoms,
      assessment.age_months,
      assessment.urgency,
      assessment.reason,
      assessment.recommended_action,
      assessment.matched_rule_id,
      assessment.transcript,
      assessment.metadata,
      assessment.created_by,
      assessment.created_at,
    ]
  );

  return result.rows[0];
}

async function createSoapNote(payload, actorId) {
  const note = withTimestamps({
    id: payload.id || randomUUID(),
    patient_id: payload.patient_id || null,
    transcript: payload.transcript,
    subjective: payload.subjective || [],
    objective: payload.objective || [],
    assessment: payload.assessment || [],
    plan: payload.plan || [],
    generated_by: actorId || null,
  });

  if (getDbMode() === 'memory') {
    store.memory.soapNotes.push(note);
    return note;
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO soap_notes (
      id, patient_id, transcript, subjective, objective, assessment, plan, generated_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [
      note.id,
      note.patient_id,
      note.transcript,
      note.subjective,
      note.objective,
      note.assessment,
      note.plan,
      note.generated_by,
      note.created_at,
    ]
  );

  return result.rows[0];
}

async function listFollowups(filters = {}) {
  if (getDbMode() === 'memory') {
    return store.memory.followups.filter((followup) => {
      if (filters.patient_id && followup.patient_id !== filters.patient_id) {
        return false;
      }

      if (filters.status && followup.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  const pool = createPool();
  const clauses = [];
  const values = [];

  if (filters.patient_id) {
    values.push(filters.patient_id);
    clauses.push(`patient_id = $${values.length}`);
  }

  if (filters.status) {
    values.push(filters.status);
    clauses.push(`status = $${values.length}`);
  }

  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM followups ${whereClause} ORDER BY due_date ASC, created_at DESC`,
    values
  );

  return result.rows;
}

async function createFollowup(payload, actorId) {
  const followup = withTimestamps({
    id: payload.id || randomUUID(),
    patient_id: payload.patient_id,
    due_date: payload.due_date,
    status: payload.status || 'scheduled',
    instructions: payload.instructions,
    urgency: payload.urgency || null,
    created_by: actorId || null,
  });

  if (getDbMode() === 'memory') {
    store.memory.followups.push(followup);
    return followup;
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO followups (
      id, patient_id, due_date, status, instructions, urgency, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      followup.id,
      followup.patient_id,
      followup.due_date,
      followup.status,
      followup.instructions,
      followup.urgency,
      followup.created_by,
      followup.created_at,
    ]
  );

  return result.rows[0];
}

async function insertAuditEvent(payload) {
  const event = withTimestamps({
    id: payload.id || randomUUID(),
    event_type: payload.event_type,
    method: payload.method,
    route: payload.route,
    status_code: Number(payload.status_code),
    actor_id: payload.actor_id || null,
    payload: payload.payload || {},
  });

  if (getDbMode() === 'memory') {
    store.memory.auditEvents.push(event);
    return event;
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO audit_events (id, event_type, method, route, status_code, actor_id, payload, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      event.id,
      event.event_type,
      event.method,
      event.route,
      event.status_code,
      event.actor_id,
      event.payload,
      event.created_at,
    ]
  );

  return result.rows[0];
}

module.exports = {
  bootstrapDatabase,
  closeDatabase,
  createFollowup,
  createPatient,
  createSoapNote,
  createTriageAssessment,
  findPatientById,
  getDbMode,
  insertAuditEvent,
  listFollowups,
  listPatients,
  resetMemoryDatabase,
};
