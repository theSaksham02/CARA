process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { createApp } = require('../server');
const {
  bootstrapDatabase,
  createPatient,
  createTriageAssessment,
  listAssistantInteractions,
  listContactSubmissions,
  resetMemoryDatabase,
} = require('../db/setup');
const { buildIndex } = require('../services/ragService');

const app = createApp();

test.beforeEach(async () => {
  resetMemoryDatabase();
  await bootstrapDatabase();
});

test('public join-us submissions persist through backend API', async () => {
  const response = await request(app).post('/public/join-us').send({
    name: 'Asha Nair',
    email: 'asha@example.com',
    role: 'Developer (OSS)',
    message: 'I would like to contribute to CARA.',
  });

  assert.equal(response.statusCode, 201);
  assert.equal(response.body.submission.status, 'new');

  const rows = await listContactSubmissions();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].email, 'asha@example.com');
});

test('assistant ask route returns grounded response and logs interaction', async () => {
  const patient = await createPatient(
    {
      id: 'assistant-patient-001',
      full_name: 'Assistant Patient',
      age_months: 36,
      caregiver_name: 'Mina',
    },
    'test-user'
  );

  await createTriageAssessment(
    {
      patient_id: patient.id,
      symptoms: ['fever', 'chest indrawing'],
      age_months: 36,
      urgency: 'RED',
      reason: 'Danger signs present.',
      recommended_action: 'Refer urgently.',
      suggested_tests: ['respiratory rate'],
      protocol_version: '1.0.0',
      matched_rule_id: 'imci-pneumonia-severe-red-001',
    },
    'test-user'
  );

  await buildIndex({ patient_id: patient.id, persist: false });

  const response = await request(app).post('/api/assistant').send({
    question: 'What should I do for severe breathing signs?',
    patient_id: patient.id,
    top_k: 5,
  });

  assert.equal(response.statusCode, 200);
  assert.equal(typeof response.body.answer, 'string');
  assert.ok(Array.isArray(response.body.citations));
  assert.equal(typeof response.body.escalate, 'boolean');

  const logs = await listAssistantInteractions({ patient_id: patient.id });
  assert.equal(logs.length, 1);
  assert.equal(logs[0].question, 'What should I do for severe breathing signs?');

  const listResponse = await request(app)
    .get('/api/assistant/logs')
    .query({ patient_id: patient.id, limit: 10 });
  assert.equal(listResponse.statusCode, 200);
  assert.equal(listResponse.body.interactions.length, 1);
});
