process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../server');
const { bootstrapDatabase, resetMemoryDatabase } = require('../db/setup');

const app = createApp();

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
