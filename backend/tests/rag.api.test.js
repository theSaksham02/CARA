process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

const { bootstrapDatabase, resetMemoryDatabase } = require('../db/setup');
const { createApp } = require('../server');

const app = createApp();

test.beforeEach(async () => {
  resetMemoryDatabase();
  await bootstrapDatabase();
});

test('rag endpoints build index, report status, and answer with citations', async () => {
  const patientResponse = await request(app).post('/api/patients').send({
    full_name: 'RAG API Patient',
    age_months: 22,
    caregiver_name: 'Asha',
  });
  const patientId = patientResponse.body.patient.id;

  await request(app).post('/api/triage/assess').send({
    patient_id: patientId,
    symptoms: ['fever', 'chest indrawing'],
    age_months: 22,
  });

  await request(app).post('/api/notes/generate').send({
    patient_id: patientId,
    transcript: 'Caregiver reports fever and difficult breathing. Plan urgent referral.',
  });

  const buildResponse = await request(app).post('/api/rag/index/build').send({
    patient_id: patientId,
    persist: false,
  });
  assert.equal(buildResponse.statusCode, 200);
  assert.equal(buildResponse.body.status, 'ok');
  assert.ok(buildResponse.body.stats.total_chunks > 0);

  const statusResponse = await request(app).get('/api/rag/index/status');
  assert.equal(statusResponse.statusCode, 200);
  assert.equal(statusResponse.body.index.ready, true);

  const queryResponse = await request(app).post('/api/rag/query').send({
    question: 'What urgent action is recommended for this patient?',
    patient_id: patientId,
    top_k: 5,
  });

  assert.equal(queryResponse.statusCode, 200);
  assert.equal(typeof queryResponse.body.answer, 'string');
  assert.equal(typeof queryResponse.body.confidence, 'number');
  assert.equal(typeof queryResponse.body.escalate, 'boolean');
  assert.ok(Array.isArray(queryResponse.body.citations));
  assert.ok(queryResponse.body.citations.length >= 1);
});

test('rag query validates request schema', async () => {
  const response = await request(app).post('/api/rag/query').send({
    question: '',
  });

  assert.equal(response.statusCode, 400);
  assert.ok(Array.isArray(response.body.errors));
});
