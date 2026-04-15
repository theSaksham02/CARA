process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  bootstrapDatabase,
  createPatient,
  createSoapNote,
  createTriageAssessment,
  resetMemoryDatabase,
} = require('../db/setup');
const { buildIndex } = require('../services/ragService');
const { getIndex } = require('../services/rag/ragIndexStore');

test.beforeEach(async () => {
  resetMemoryDatabase();
  await bootstrapDatabase();
});

test('rag index builds protocol and patient chunks deterministically', async () => {
  const patient = await createPatient(
    {
      id: 'patient-rag-001',
      full_name: 'RAG Patient',
      age_months: 24,
      caregiver_name: 'Caregiver',
      village: 'Ikeja',
    },
    'test-user'
  );

  await createTriageAssessment(
    {
      patient_id: patient.id,
      symptoms: ['fever', 'chest indrawing'],
      age_months: 24,
      urgency: 'RED',
      reason: 'Danger sign present.',
      recommended_action: 'Urgent referral.',
      suggested_tests: ['pulse ox'],
      protocol_version: '1.0.0',
      matched_rule_id: 'imci-pneumonia-severe-red-001',
    },
    'test-user'
  );

  await createSoapNote(
    {
      patient_id: patient.id,
      transcript: 'Caregiver reports fever and breathing difficulty.',
      subjective: ['fever'],
      objective: ['chest indrawing'],
      assessment: ['severe pneumonia risk'],
      plan: ['urgent referral'],
    },
    'test-user'
  );

  const firstBuild = await buildIndex({ persist: false });
  const firstIds = getIndex().chunks.map((chunk) => chunk.id);

  const secondBuild = await buildIndex({ persist: false });
  const secondIds = getIndex().chunks.map((chunk) => chunk.id);

  assert.ok(firstBuild.stats.protocol_chunks > 0);
  assert.ok(firstBuild.stats.patient_chunks > 0);
  assert.equal(firstBuild.stats.total_chunks, firstBuild.stats.protocol_chunks + firstBuild.stats.patient_chunks);
  assert.deepEqual(firstIds, secondIds);
  assert.ok(secondBuild.built_at);
});
