const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const { evaluateTriage } = require('../engine/engine');

const testCases = require(path.resolve(__dirname, './fixtures/triage-cases.json'));

test('engine matches expected urgency and action for bundled test cases', () => {
  for (const testCase of testCases) {
    const result = evaluateTriage({
      symptoms: testCase.symptoms,
      age_months: testCase.age_months,
    });

    assert.equal(result.urgency, testCase.expected_urgency, testCase.name);
    assert.equal(result.recommended_action, testCase.expected_action, testCase.name);
  }
});
