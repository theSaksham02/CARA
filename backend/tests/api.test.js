process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../server');
const { bootstrapDatabase, resetMemoryDatabase } = require('../db/setup');

const app = createApp();
const waitForAuditFlush = () => new Promise((resolve) => setTimeout(resolve, 25));

test.beforeEach(async () => {
  resetMemoryDatabase();
  await bootstrapDatabase();
});

test('health endpoint reports runtime modes', async () => {
  const response = await request(app).get('/health');

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.db_mode, 'memory');
  assert.equal(response.body.auth_mode, 'bypass');
});

test('patient routes create and list patients', async () => {
  const createResponse = await request(app).post('/api/patients').send({
    full_name: 'Amara Okoye',
    age_months: 14,
    caregiver_name: 'Ngozi Okoye',
    sex: 'female',
    village: 'Ikeja',
  });

  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.body.patient.full_name, 'Amara Okoye');

  const listResponse = await request(app).get('/api/patients');

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.patients.length, 1);
});

test('triage route stores an assessment for an existing patient', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Tolu Adisa',
    age_months: 24,
  });

  const triageResponse = await request(app).post('/api/triage/assess').send({
    patient_id: patientResponse.body.patient.id,
    symptoms: ['cough', 'fast breathing'],
    age_months: 24,
    metadata: { source: 'field-view' },
  });

  assert.equal(triageResponse.statusCode, 200);
  assert.equal(triageResponse.body.assessment.urgency, 'YELLOW');
  assert.equal(triageResponse.body.assessment.matched_rule_id, 'pneumonia-yellow');
});

test('note route generates soap sections', async () => {
  const response = await request(app).post('/api/notes/generate').send({
    transcript:
      'Mother reports fever since yesterday. Temperature measured at 38.2. Possible uncomplicated fever. Plan to monitor at home.',
  });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.note.subjective, ['Mother reports fever since yesterday']);
  assert.deepEqual(response.body.note.objective, ['Temperature measured at 38.2']);
  assert.deepEqual(response.body.note.assessment, ['Possible uncomplicated fever']);
  assert.deepEqual(response.body.note.plan, ['Plan to monitor at home']);
});

test('follow-up routes create and filter follow-ups', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Binta Musa',
    age_months: 18,
  });

  const createResponse = await request(app).post('/api/followup').send({
    patient_id: patientResponse.body.patient.id,
    due_date: '2026-04-09',
    instructions: 'Recheck hydration after oral rehydration salts.',
    urgency: 'YELLOW',
  });

  assert.equal(createResponse.statusCode, 201);

  const listResponse = await request(app)
    .get('/api/followup')
    .query({ patient_id: patientResponse.body.patient.id });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.followups.length, 1);
  assert.equal(listResponse.body.followups[0].instructions, 'Recheck hydration after oral rehydration salts.');
});

test('triage queue and dashboard overview expose frontend-facing read models', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Amara Okoye',
    age_months: 14,
    caregiver_name: 'Ngozi Okoye',
  });

  await request(app).post('/api/triage/assess').send({
    patient_id: patientResponse.body.patient.id,
    symptoms: ['fever', 'difficulty breathing'],
    age_months: 14,
  });

  await request(app).post('/api/notes/generate').send({
    patient_id: patientResponse.body.patient.id,
    transcript: 'Mother reports fever. Possible severe pneumonia. Plan urgent referral.',
  });

  await request(app).post('/api/followup').send({
    patient_id: patientResponse.body.patient.id,
    due_date: '2026-04-09',
    instructions: 'Confirm urgent referral arrival.',
    urgency: 'RED',
  });

  const queueResponse = await request(app).get('/api/triage/queue').query({ urgency: 'RED' });
  assert.equal(queueResponse.statusCode, 200);
  assert.equal(queueResponse.body.queue.length, 1);
  assert.equal(queueResponse.body.queue[0].patient_name, 'Amara Okoye');

  const overviewResponse = await request(app).get('/api/dashboard/overview').query({ queue_limit: 3 });
  assert.equal(overviewResponse.statusCode, 200);
  assert.equal(overviewResponse.body.overview.kpis.patients_total, 1);
  assert.equal(overviewResponse.body.overview.kpis.patients_triaged_today, 1);
  assert.equal(overviewResponse.body.overview.high_urgency_cases.length, 1);
});

test('note routes list and retrieve generated SOAP notes', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Julian Vane',
    age_months: 48,
  });

  const noteResponse = await request(app).post('/api/notes/generate').send({
    patient_id: patientResponse.body.patient.id,
    transcript:
      'Patient reports cough for two days. Temperature measured at 38.0. Possible uncomplicated fever. Plan to monitor overnight.',
  });

  const listResponse = await request(app)
    .get('/api/notes')
    .query({ patient_id: patientResponse.body.patient.id, search: 'cough' });

  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.notes.length, 1);
  assert.equal(listResponse.body.notes[0].id, noteResponse.body.note.id);

  const detailResponse = await request(app).get(`/api/notes/${noteResponse.body.note.id}`);
  assert.equal(detailResponse.statusCode, 200);
  assert.deepEqual(detailResponse.body.note.plan, ['Plan to monitor overnight']);
});

test('patient summary routes return patient-safe visit context', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Binta Musa',
    age_months: 18,
  });

  await request(app).post('/api/triage/assess').send({
    patient_id: patientResponse.body.patient.id,
    symptoms: ['diarrhoea', 'sunken eyes'],
    age_months: 18,
  });

  await request(app).post('/api/notes/generate').send({
    patient_id: patientResponse.body.patient.id,
    transcript:
      'Mother reports diarrhoea. Observed dry mouth. Possible dehydration risk. Plan oral rehydration and same-day review.',
  });

  await request(app).post('/api/followup').send({
    patient_id: patientResponse.body.patient.id,
    due_date: '2026-04-17',
    instructions: 'For your TB check-up',
    urgency: 'YELLOW',
  });

  const clinicianSummaryResponse = await request(app).get(
    `/api/patients/${patientResponse.body.patient.id}/summary`
  );
  assert.equal(clinicianSummaryResponse.statusCode, 200);
  assert.equal(clinicianSummaryResponse.body.summary.patient.full_name, 'Binta Musa');
  assert.equal(clinicianSummaryResponse.body.summary.latest_assessment.urgency, 'YELLOW');
  assert.equal(clinicianSummaryResponse.body.summary.next_followup.instructions, 'For your TB check-up');

  const patientSummaryResponse = await request(app)
    .get('/api/patients/me/summary')
    .query({ patient_id: patientResponse.body.patient.id });
  assert.equal(patientSummaryResponse.statusCode, 200);
  assert.equal(patientSummaryResponse.body.summary.highlighted_symptoms[0], 'diarrhoea');
});

test('impact analytics and audit endpoints expose sanitized backend telemetry', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'Mina Ade',
    age_months: 20,
  });

  await request(app).post('/api/triage/assess').send({
    patient_id: patientResponse.body.patient.id,
    symptoms: ['cough', 'Breathing   Fast'],
    age_months: 20,
    transcript: 'This should never be stored in full in the audit payload.',
  });

  await request(app).post('/api/notes/generate').send({
    patient_id: patientResponse.body.patient.id,
    transcript:
      'Mother reports cough. Temperature measured at 38.2. Possible pneumonia. Plan same-day review.',
  });

  await request(app).post('/api/followup').send({
    patient_id: patientResponse.body.patient.id,
    due_date: '2026-04-09',
    instructions: 'Recheck breathing tomorrow.',
    urgency: 'YELLOW',
  });

  await waitForAuditFlush();

  const analyticsResponse = await request(app).get('/api/analytics/impact').query({ range: 'today' });
  assert.equal(analyticsResponse.statusCode, 200);
  assert.equal(analyticsResponse.body.analytics.metrics.patients_managed, 1);
  assert.equal(analyticsResponse.body.analytics.daily_volume.length, 1);

  const auditResponse = await request(app).get('/api/audit').query({ event_type: 'write', limit: 10 });
  assert.equal(auditResponse.statusCode, 200);
  assert.ok(auditResponse.body.events.length >= 3);

  const triageAuditEvent = auditResponse.body.events.find((event) => event.route === '/api/triage/assess');
  assert.ok(triageAuditEvent);
  assert.deepEqual(triageAuditEvent.payload.body_keys.sort(), ['age_months', 'patient_id', 'symptoms', 'transcript']);
  assert.ok(!('transcript' in triageAuditEvent.payload.body_preview));
});
