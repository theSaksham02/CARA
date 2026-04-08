const test = require('node:test');
const assert = require('node:assert/strict');

const { validateProtocols } = require('../protocols');

test('validateProtocols accepts a well-formed IMCI bundle with age gates', () => {
  const protocols = validateProtocols({
    version: '1.2.0',
    source: 'imci-hand-off',
    default_action: 'Provide routine monitoring guidance.',
    rules: [
      {
        id: 'danger-under-two-red',
        priority: 100,
        symptomsAny: ['difficulty breathing', 'convulsions'],
        urgency: 'RED',
        recommended_action: 'Urgent referral to the nearest clinician or hospital.',
        reason: 'Danger sign present in a child under two years.',
        max_age_months: 24,
      },
      {
        id: 'fever-green',
        priority: 20,
        symptomsAll: ['fever'],
        urgency: 'GREEN',
        recommended_action: 'Monitor at home and review if symptoms worsen.',
        reason: 'Fever without danger signs can be monitored.',
        min_age_months: 0,
      },
    ],
  });

  assert.equal(protocols.rules[0].max_age_months, 24);
  assert.equal(protocols.rules[1].min_age_months, 0);
  assert.equal(protocols.rules[0].urgency, 'RED');
});

test('validateProtocols rejects malformed bundles with clear errors', () => {
  assert.throws(
    () =>
      validateProtocols({
        default_action: 'fallback',
        rules: [
          {
            id: 'bad-rule',
            priority: 10,
            urgency: 'amber',
            recommended_action: 'review',
            reason: 'bad urgency',
            symptomsAll: ['fever'],
          },
        ],
      }),
    /RED, YELLOW, or GREEN/
  );

  assert.throws(
    () =>
      validateProtocols({
        default_action: 'fallback',
        rules: [
          {
            id: 'age-window-bad',
            priority: 10,
            urgency: 'YELLOW',
            recommended_action: 'review',
            reason: 'bad age window',
            symptomsAll: ['cough'],
            min_age_months: 36,
            max_age_months: 12,
          },
        ],
      }),
    /min_age_months greater than max_age_months/
  );
});
