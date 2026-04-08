'use strict';

const { loadProtocols } = require('../protocols');

function normalizeSymptom(symptom) {
  return String(symptom || '')
    .trim()
    .toLowerCase();
}

function normalizeSymptoms(symptoms) {
  return [...new Set((symptoms || []).map(normalizeSymptom).filter(Boolean))];
}

function includesAll(pool, required = []) {
  return required.every((symptom) => pool.includes(normalizeSymptom(symptom)));
}

function includesAny(pool, optional = []) {
  return optional.length === 0 || optional.some((symptom) => pool.includes(normalizeSymptom(symptom)));
}

function matchesRule(rule, normalizedSymptoms, ageMonths) {
  if (typeof rule.min_age_months === 'number' && ageMonths < rule.min_age_months) {
    return false;
  }

  if (typeof rule.max_age_months === 'number' && ageMonths > rule.max_age_months) {
    return false;
  }

  return includesAll(normalizedSymptoms, rule.symptomsAll) && includesAny(normalizedSymptoms, rule.symptomsAny);
}

function evaluateTriage(input) {
  const protocols = loadProtocols();
  const symptoms = normalizeSymptoms(input.symptoms);
  const ageMonths = Number(input.age_months);
  const orderedRules = [...protocols.rules].sort((left, right) => right.priority - left.priority);

  const matchedRule = orderedRules.find((rule) => matchesRule(rule, symptoms, ageMonths));

  if (matchedRule) {
    return {
      urgency: matchedRule.urgency,
      reason: matchedRule.reason,
      recommended_action: matchedRule.recommended_action,
      matched_rule_id: matchedRule.id,
      symptoms,
      age_months: ageMonths,
    };
  }

  return {
    urgency: 'GREEN',
    reason: 'No higher-risk IMCI prototype rule matched the submitted symptoms.',
    recommended_action: protocols.default_action,
    matched_rule_id: 'default-green',
    symptoms,
    age_months: ageMonths,
  };
}

module.exports = {
  evaluateTriage,
  normalizeSymptoms,
};
