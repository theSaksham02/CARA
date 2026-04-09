'use strict';

const { loadProtocols } = require('../protocols');

const symptomAliases = new Map([
  ['breathing issues', 'difficulty breathing'],
  ['breathing fast', 'fast breathing'],
  ['rapid breathing', 'fast breathing'],
  ['breathing difficulty', 'difficulty breathing'],
  ['can not drink', 'unable to drink'],
  ['cannot drink', 'unable to drink'],
  ['wont drink', 'unable to drink'],
  ['drinking poorly', 'drinks poorly'],
  ['very sleepy', 'lethargy'],
  ['fits', 'convulsions'],
  ['seizure', 'convulsions'],
  ['fitting', 'convulsions'],
  ['drowsy', 'lethargic'],
  ['sleepy', 'lethargic'],
  ['not responding', 'unconscious'],
  ['unresponsive', 'unconscious'],
  ['watery stool', 'diarrhoea'],
  ['loose stool', 'diarrhoea'],
  ['loose stools', 'diarrhoea'],
  ['diarrhea', 'diarrhoea'],
  ['vomits everything', 'vomiting everything'],
  ['keeps vomiting', 'vomiting everything'],
  ['pale palms', 'severe palmar pallor'],
  ['very pale', 'severe palmar pallor'],
  ['swollen feet', 'oedema of both feet'],
  ['puffy feet', 'oedema of both feet'],
  ['stiff neck', 'stiff neck'],
  ['neck stiffness', 'stiff neck'],
  ['chest in drawing', 'chest indrawing'],
  ['chest recession', 'chest indrawing'],
  ['noisy breathing', 'stridor'],
  ['high temperature', 'fever'],
  ['hot body', 'fever'],
  ['blood in diarrhea', 'blood in stool'],
  ['bloody stool', 'blood in stool'],
]);

function normalizeSymptom(symptom) {
  const normalizedSymptom = String(symptom || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

  return symptomAliases.get(normalizedSymptom) || normalizedSymptom;
}

function normalizeSymptoms(symptoms) {
  return [...new Set((symptoms || []).map(normalizeSymptom).filter(Boolean))];
}

function normalizeRuleSymptom(symptom) {
  return String(symptom || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function includesAll(pool, required = []) {
  return required.every((symptom) => pool.includes(normalizeRuleSymptom(symptom)));
}

function includesAny(pool, optional = []) {
  return optional.length === 0 || optional.some((symptom) => pool.includes(normalizeRuleSymptom(symptom)));
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
