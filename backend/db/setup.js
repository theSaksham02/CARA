'use strict';

const { randomUUID } = require('node:crypto');
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const store = {
  pool: null,
  supabase: null,
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
    suggested_tests JSONB NOT NULL DEFAULT '[]'::jsonb,
    protocol_version TEXT,
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

  if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
    return 'supabase';
  }

  return process.env.DATABASE_URL || process.env.SUPABASE_DB_URL ? 'postgres' : 'memory';
}

function getSupabaseDb() {
  if (store.supabase) {
    return store.supabase;
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required for supabase DB mode.');
  }

  store.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return store.supabase;
}

function throwOnError(result, context) {
  if (result.error) {
    throw new Error(`Supabase ${context}: ${result.error.message}`);
  }

  return result.data;
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

  const mode = getDbMode();

  if (mode === 'memory') {
    store.bootstrapped = true;
    return { mode: 'memory' };
  }

  if (mode === 'supabase') {
    const sb = getSupabaseDb();
    const { error } = await sb.from('patients').select('id').limit(1);
    if (error && error.code === 'PGRST205') {
      console.warn('CARA tables not found in Supabase. Run the schema SQL in the Supabase SQL Editor first.');
    }
    store.bootstrapped = true;
    return { mode: 'supabase' };
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

  store.supabase = null;
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

function sortByCreatedAtDesc(rows) {
  return [...rows].sort((left, right) => right.created_at.localeCompare(left.created_at));
}

function normalizeLimit(limit, fallback = 25) {
  const numericLimit = Number(limit);
  if (!Number.isInteger(numericLimit) || numericLimit <= 0) {
    return fallback;
  }

  return Math.min(numericLimit, 100);
}

function applyCreatedAtLimit(rows, limit) {
  return sortByCreatedAtDesc(rows).slice(0, normalizeLimit(limit));
}

function getRangeStart(range, now = new Date()) {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  if (range === 'week') {
    start.setUTCDate(start.getUTCDate() - 6);
    return start;
  }

  if (range === 'month') {
    start.setUTCDate(1);
    return start;
  }

  return start;
}

function isWithinRange(createdAt, range) {
  return new Date(createdAt) >= getRangeStart(range);
}

function toIsoDate(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function buildQueueEntries(patients, assessments, filters = {}) {
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const latestByPatientId = new Map();

  for (const assessment of sortByCreatedAtDesc(assessments)) {
    if (!assessment.patient_id || latestByPatientId.has(assessment.patient_id)) {
      continue;
    }

    latestByPatientId.set(assessment.patient_id, assessment);
  }

  const searchTerm = String(filters.search || '').trim().toLowerCase();
  const urgencyFilter = filters.urgency ? String(filters.urgency).trim().toUpperCase() : null;

  const queueEntries = [...latestByPatientId.values()]
    .map((assessment) => {
      const patient = patientById.get(assessment.patient_id);
      if (!patient) {
        return null;
      }

      return {
        patient_id: patient.id,
        patient_name: patient.full_name,
        age_months: patient.age_months,
        age_display: patient.age_months >= 24 ? `${Math.floor(patient.age_months / 12)}y` : `${patient.age_months}m`,
        sex: patient.sex,
        village: patient.village,
        urgency: assessment.urgency,
        reason: assessment.reason,
        condition_label: assessment.reason,
        matched_rule_id: assessment.matched_rule_id,
        recommended_action: assessment.recommended_action,
        symptoms: assessment.symptoms,
        triage_time: assessment.created_at,
        triage_time_display: new Date(assessment.created_at).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
    })
    .filter(Boolean)
    .filter((entry) => {
      if (urgencyFilter && entry.urgency !== urgencyFilter) {
        return false;
      }

      if (!searchTerm) {
        return true;
      }

      return (
        entry.patient_name.toLowerCase().includes(searchTerm) ||
        entry.symptoms.some((symptom) => String(symptom).toLowerCase().includes(searchTerm)) ||
        String(entry.matched_rule_id || '').toLowerCase().includes(searchTerm)
      );
    });

  return queueEntries.slice(0, normalizeLimit(filters.limit, 50));
}

async function listPatients() {
  if (getDbMode() === 'memory') {
    return [...store.memory.patients].sort((left, right) => right.created_at.localeCompare(left.created_at));
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    return throwOnError(await sb.from('patients').select('*').order('created_at', { ascending: false }), 'listPatients');
  }

  const pool = createPool();
  const result = await pool.query('SELECT * FROM patients ORDER BY created_at DESC');
  return result.rows;
}

async function findPatientById(patientId) {
  if (getDbMode() === 'memory') {
    return store.memory.patients.find((patient) => patient.id === patientId) || null;
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const { data } = await sb.from('patients').select('*').eq('id', patientId).maybeSingle();
    return data || null;
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

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const rows = throwOnError(await sb.from('patients').insert(patient).select(), 'createPatient');
    return rows[0];
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
    suggested_tests: payload.suggested_tests || [],
    protocol_version: payload.protocol_version || null,
    matched_rule_id: payload.matched_rule_id || null,
    transcript: payload.transcript || null,
    metadata: payload.metadata || {},
    created_by: actorId || null,
  });

  if (getDbMode() === 'memory') {
    store.memory.triageAssessments.push(assessment);
    return assessment;
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const rows = throwOnError(await sb.from('triage_assessments').insert(assessment).select(), 'createTriageAssessment');
    return rows[0];
  }

  const pool = createPool();
  const result = await pool.query(
    `INSERT INTO triage_assessments (
      id, patient_id, symptoms, age_months, urgency, reason, recommended_action, suggested_tests, protocol_version, matched_rule_id, transcript, metadata, created_by, created_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *`,
    [
      assessment.id,
      assessment.patient_id,
      JSON.stringify(assessment.symptoms),
      assessment.age_months,
      assessment.urgency,
      assessment.reason,
      assessment.recommended_action,
      JSON.stringify(assessment.suggested_tests),
      assessment.protocol_version,
      assessment.matched_rule_id,
      assessment.transcript,
      assessment.metadata,
      assessment.created_by,
      assessment.created_at,
    ]
  );

  return result.rows[0];
}

async function listTriageAssessments(filters = {}) {
  const limit = normalizeLimit(filters.limit, 100);

  if (getDbMode() === 'memory') {
    return applyCreatedAtLimit(
      store.memory.triageAssessments.filter((assessment) => {
        if (filters.patient_id && assessment.patient_id !== filters.patient_id) {
          return false;
        }

        if (filters.urgency && assessment.urgency !== filters.urgency) {
          return false;
        }

        return true;
      }),
      limit
    );
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    let query = sb.from('triage_assessments').select('*');
    if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
    if (filters.urgency) query = query.eq('urgency', filters.urgency);
    return throwOnError(await query.order('created_at', { ascending: false }).limit(limit), 'listTriageAssessments');
  }

  const pool = createPool();
  const clauses = [];
  const values = [];

  if (filters.patient_id) {
    values.push(filters.patient_id);
    clauses.push(`patient_id = $${values.length}`);
  }

  if (filters.urgency) {
    values.push(filters.urgency);
    clauses.push(`urgency = $${values.length}`);
  }

  values.push(limit);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM triage_assessments ${whereClause} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return result.rows;
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

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const rows = throwOnError(await sb.from('soap_notes').insert(note).select(), 'createSoapNote');
    return rows[0];
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

async function listSoapNotes(filters = {}) {
  const limit = normalizeLimit(filters.limit, 50);
  const searchTerm = String(filters.search || '').trim().toLowerCase();

  if (getDbMode() === 'memory') {
    return applyCreatedAtLimit(
      store.memory.soapNotes.filter((note) => {
        if (filters.patient_id && note.patient_id !== filters.patient_id) {
          return false;
        }

        if (!searchTerm) {
          return true;
        }

        return note.transcript.toLowerCase().includes(searchTerm);
      }),
      limit
    );
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    let query = sb.from('soap_notes').select('*');
    if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
    if (searchTerm) query = query.ilike('transcript', `%${searchTerm}%`);
    return throwOnError(await query.order('created_at', { ascending: false }).limit(limit), 'listSoapNotes');
  }

  const pool = createPool();
  const clauses = [];
  const values = [];

  if (filters.patient_id) {
    values.push(filters.patient_id);
    clauses.push(`patient_id = $${values.length}`);
  }

  if (searchTerm) {
    values.push(`%${searchTerm}%`);
    clauses.push(`LOWER(transcript) LIKE $${values.length}`);
  }

  values.push(limit);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM soap_notes ${whereClause} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return result.rows;
}

async function findSoapNoteById(noteId) {
  if (getDbMode() === 'memory') {
    return store.memory.soapNotes.find((note) => note.id === noteId) || null;
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const { data } = await sb.from('soap_notes').select('*').eq('id', noteId).maybeSingle();
    return data || null;
  }

  const pool = createPool();
  const result = await pool.query('SELECT * FROM soap_notes WHERE id = $1 LIMIT 1', [noteId]);
  return result.rows[0] || null;
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

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    let query = sb.from('followups').select('*');
    if (filters.patient_id) query = query.eq('patient_id', filters.patient_id);
    if (filters.status) query = query.eq('status', filters.status);
    return throwOnError(await query.order('due_date', { ascending: true }).order('created_at', { ascending: false }), 'listFollowups');
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

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const rows = throwOnError(await sb.from('followups').insert(followup).select(), 'createFollowup');
    return rows[0];
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

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    const rows = throwOnError(await sb.from('audit_events').insert(event).select(), 'insertAuditEvent');
    return rows[0];
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

async function listAuditEvents(filters = {}) {
  const limit = normalizeLimit(filters.limit, 50);

  if (getDbMode() === 'memory') {
    return applyCreatedAtLimit(
      store.memory.auditEvents.filter((event) => {
        if (filters.actor_id && event.actor_id !== filters.actor_id) {
          return false;
        }

        if (filters.event_type && event.event_type !== filters.event_type) {
          return false;
        }

        return true;
      }),
      limit
    );
  }

  if (getDbMode() === 'supabase') {
    const sb = getSupabaseDb();
    let query = sb.from('audit_events').select('*');
    if (filters.actor_id) query = query.eq('actor_id', filters.actor_id);
    if (filters.event_type) query = query.eq('event_type', filters.event_type);
    return throwOnError(await query.order('created_at', { ascending: false }).limit(limit), 'listAuditEvents');
  }

  const pool = createPool();
  const clauses = [];
  const values = [];

  if (filters.actor_id) {
    values.push(filters.actor_id);
    clauses.push(`actor_id = $${values.length}`);
  }

  if (filters.event_type) {
    values.push(filters.event_type);
    clauses.push(`event_type = $${values.length}`);
  }

  values.push(limit);
  const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT * FROM audit_events ${whereClause} ORDER BY created_at DESC LIMIT $${values.length}`,
    values
  );
  return result.rows;
}

async function listTriageQueue(filters = {}) {
  const [patients, assessments] = await Promise.all([
    listPatients(),
    listTriageAssessments({ limit: filters.limit ? Math.max(Number(filters.limit), 100) : 200 }),
  ]);

  return buildQueueEntries(patients, assessments, filters);
}

async function getDashboardOverview(filters = {}) {
  const [patients, assessments, notes, followups, queueEntries] = await Promise.all([
    listPatients(),
    listTriageAssessments({ limit: 500 }),
    listSoapNotes({ limit: 500 }),
    listFollowups(),
    listTriageQueue({ limit: filters.queue_limit || 5 }),
  ]);

  const today = toIsoDate(new Date());
  const assessmentsToday = assessments.filter((assessment) => toIsoDate(assessment.created_at) === today);
  const notesToday = notes.filter((note) => toIsoDate(note.created_at) === today);
  const followupsDueToday = followups.filter(
    (followup) => followup.due_date <= today && followup.status !== 'completed'
  );

  return {
    kpis: {
      patients_total: patients.length,
      patients_triaged_today: assessmentsToday.length,
      red_urgent: assessmentsToday.filter((assessment) => assessment.urgency === 'RED').length,
      soap_notes_today: notesToday.length,
      followups_due: followupsDueToday.length,
    },
    high_urgency_cases: queueEntries.filter((entry) => entry.urgency !== 'GREEN'),
  };
}

async function getPatientSummary(patientId) {
  const [patient, assessments, notes, followups] = await Promise.all([
    findPatientById(patientId),
    listTriageAssessments({ patient_id: patientId, limit: 20 }),
    listSoapNotes({ patient_id: patientId, limit: 20 }),
    listFollowups({ patient_id: patientId }),
  ]);

  if (!patient) {
    return null;
  }

  const latestAssessment = assessments[0] || null;
  const latestNote = notes[0] || null;
  const nextFollowup =
    [...followups]
      .filter((followup) => followup.status !== 'completed')
      .sort((left, right) => String(left.due_date).localeCompare(String(right.due_date)))[0] || null;

  return {
    patient,
    latest_assessment:
      latestAssessment &&
      {
        urgency: latestAssessment.urgency,
        reason: latestAssessment.reason,
        recommended_action: latestAssessment.recommended_action,
        symptoms: latestAssessment.symptoms,
        matched_rule_id: latestAssessment.matched_rule_id,
        created_at: latestAssessment.created_at,
      },
    highlighted_symptoms: latestAssessment ? latestAssessment.symptoms.slice(0, 3) : [],
    clinician_note:
      latestNote &&
      {
        note_id: latestNote.id,
        summary:
          latestNote.assessment[0] ||
          latestNote.plan[0] ||
          latestNote.subjective[0] ||
          'No clinician summary available yet.',
        care_plan: latestNote.plan,
        created_at: latestNote.created_at,
      },
    next_followup:
      nextFollowup &&
      {
        id: nextFollowup.id,
        due_date: nextFollowup.due_date,
        status: nextFollowup.status,
        instructions: nextFollowup.instructions,
        urgency: nextFollowup.urgency,
      },
  };
}

async function getImpactAnalytics(range = 'today') {
  const safeRange = ['today', 'week', 'month'].includes(range) ? range : 'today';
  const [assessments, notes, followups] = await Promise.all([
    listTriageAssessments({ limit: 1000 }),
    listSoapNotes({ limit: 1000 }),
    listFollowups(),
  ]);

  const rangedAssessments = assessments.filter((assessment) => isWithinRange(assessment.created_at, safeRange));
  const rangedNotes = notes.filter((note) => isWithinRange(note.created_at, safeRange));
  const rangedFollowups = followups.filter((followup) => {
    const comparableDate = `${followup.due_date}T00:00:00.000Z`;
    return isWithinRange(comparableDate, safeRange);
  });

  const urgencyCounts = rangedAssessments.reduce(
    (counts, assessment) => ({
      ...counts,
      [assessment.urgency]: (counts[assessment.urgency] || 0) + 1,
    }),
    { RED: 0, YELLOW: 0, GREEN: 0 }
  );

  const conditionMix = Object.entries(
    rangedAssessments.reduce((counts, assessment) => {
      const key = assessment.matched_rule_id || 'unclassified';
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {})
  )
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const volumeByDay = new Map();
  for (const assessment of rangedAssessments) {
    const day = toIsoDate(assessment.created_at);
    volumeByDay.set(day, (volumeByDay.get(day) || 0) + 1);
  }

  const assessmentsWithFollowup = new Set(
    rangedFollowups.map((followup) => followup.patient_id).filter(Boolean)
  );

  return {
    range: safeRange,
    metrics: {
      patients_managed: rangedAssessments.length,
      red_cases: urgencyCounts.RED,
      red_resolution_rate: rangedAssessments.length
        ? Number(((urgencyCounts.RED / rangedAssessments.length) * 100).toFixed(1))
        : 0,
      followup_rate: rangedAssessments.length
        ? Number(((assessmentsWithFollowup.size / rangedAssessments.length) * 100).toFixed(1))
        : 0,
      documentation_coverage: rangedAssessments.length
        ? Number(((rangedNotes.length / rangedAssessments.length) * 100).toFixed(1))
        : 0,
    },
    daily_volume: [...volumeByDay.entries()]
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([date, count]) => ({ date, count })),
    urgency_breakdown: [
      { urgency: 'RED', count: urgencyCounts.RED },
      { urgency: 'YELLOW', count: urgencyCounts.YELLOW },
      { urgency: 'GREEN', count: urgencyCounts.GREEN },
    ],
    condition_mix: conditionMix,
  };
}

module.exports = {
  bootstrapDatabase,
  closeDatabase,
  createFollowup,
  createPatient,
  createSoapNote,
  createTriageAssessment,
  findPatientById,
  findSoapNoteById,
  getDashboardOverview,
  getDbMode,
  getImpactAnalytics,
  getPatientSummary,
  insertAuditEvent,
  listAuditEvents,
  listFollowups,
  listPatients,
  listSoapNotes,
  listTriageAssessments,
  listTriageQueue,
  resetMemoryDatabase,
};
