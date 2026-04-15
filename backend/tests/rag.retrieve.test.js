process.env.NODE_ENV = 'test';
process.env.AUTH_MODE = 'bypass';
process.env.DB_DRIVER = 'memory';

const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  bootstrapDatabase,
  createFollowup,
  createPatient,
  createSoapNote,
  createTriageAssessment,
  resetMemoryDatabase,
} = require('../db/setup');
const { buildIndex, queryRagMemory } = require('../services/ragService');

const goldenSet = require(path.resolve(__dirname, './fixtures/rag-golden-set.json'));

test.beforeEach(async () => {
  resetMemoryDatabase();
  await bootstrapDatabase();
});

test('rag retrieval returns evidence-backed response for golden prompts', async () => {
  const patient = await createPatient(
    {
      id: 'patient-rag-002',
      full_name: 'Golden Patient',
      age_months: 18,
      caregiver_name: 'Mina',
      village: 'Lagos',
    },
    'test-user'
  );

  await createTriageAssessment(
    {
      patient_id: patient.id,
      symptoms: ['fever', 'chest indrawing'],
      age_months: 18,
      urgency: 'RED',
      reason: 'Severe respiratory danger signs.',
      recommended_action: 'Immediate referral and oxygen.',
      suggested_tests: ['respiratory rate'],
      protocol_version: '1.0.0',
      matched_rule_id: 'imci-pneumonia-severe-red-001',
    },
    'test-user'
  );

  await createSoapNote(
    {
      patient_id: patient.id,
      transcript: 'Fever and chest indrawing observed by CHW.',
      subjective: ['fever'],
      objective: ['chest indrawing'],
      assessment: ['severe pneumonia likely'],
      plan: ['refer to hospital'],
    },
    'test-user'
  );

  await createFollowup(
    {
      patient_id: patient.id,
      due_date: '2026-04-20',
      instructions: 'Verify hospital arrival and breathing status.',
      urgency: 'RED',
      status: 'scheduled',
    },
    'test-user'
  );

  await buildIndex({ persist: false });

  for (const entry of goldenSet) {
    const response = await queryRagMemory({
      question: entry.question,
      patient_id: patient.id,
      top_k: 5,
    });

    assert.equal(typeof response.answer, 'string');
    assert.equal(typeof response.confidence, 'number');
    assert.equal(typeof response.escalate, 'boolean');
    assert.ok(Array.isArray(response.citations));

    if (entry.expect_citations_min) {
      assert.ok(response.citations.length >= entry.expect_citations_min, entry.id);
    }

    if (entry.expect_escalation) {
      assert.equal(response.escalate, true, entry.id);
    }
  }
});
