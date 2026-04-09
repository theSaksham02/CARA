const { loadProtocols } = require('./loader');

// Load once at startup
const protocols = loadProtocols();

/**
 * Evaluates symptoms against the loaded WHO protocols to determine urgency.
 * @param {Array<string>} symptoms List of reported symptoms (e.g. ['fever', 'chest_indrawing'])
 * @param {string} age_group e.g., 'child'
 * @returns {Object} { level, reasons, protocol, action }
 */
function evaluateTriage(symptoms = [], age_group = 'child') {
  if (!symptoms || symptoms.length === 0) {
    return {
      level: 'GREEN',
      reasons: ['No specific symptoms reported.'],
      protocol: 'Routine',
      action: 'Routine care or checkup.'
    };
  }

  // Iterate over protocols to find the highest urgency match (RED > YELLOW > GREEN)
  // Assumes protocols in imci.json are ordered generally by severity, but we'll check all.
  
  let highestLevel = 'GREEN';
  let bestMatch = null;
  let reasons = [];

  for (const rule of protocols) {
    // Check if danger signs match
    const hasDangerSign = rule.danger_signs && rule.danger_signs.some(ds => symptoms.includes(ds));
    // Check if required symptoms match
    const hasSymptom = rule.symptoms_required && rule.symptoms_required.some(sym => symptoms.includes(sym));

    if (hasDangerSign || hasSymptom) {
      if (rule.urgency === 'RED') {
        highestLevel = 'RED';
        bestMatch = rule;
        reasons.push(rule.explanation);
        break; // Stop at first RED to prioritize immediate referral
      } else if (rule.urgency === 'YELLOW' && highestLevel !== 'RED') {
        highestLevel = 'YELLOW';
        bestMatch = rule;
        reasons.push(rule.explanation);
      } else if (rule.urgency === 'GREEN' && highestLevel === 'GREEN') {
        bestMatch = rule;
        reasons.push(rule.explanation);
      }
    }
  }

  if (bestMatch) {
    return {
      level: bestMatch.urgency,
      reasons: reasons,
      protocol: bestMatch.protocol,
      action: bestMatch.action
    };
  }

  // Default fallback if no rules match
  return {
    level: 'YELLOW',
    reasons: ['Symptoms reported but do not match exact IMCI danger rules. Requires monitoring.'],
    protocol: 'General Triage',
    action: 'Monitor patient and consult clinician.'
  };
}

module.exports = { evaluateTriage };
'use strict';

const { loadProtocols } = require('../protocols');

const symptomAliases = new Map([
  ['breathing issues', 'difficulty breathing'],
  ['breathing fast', 'fast breathing'],
  ['can not drink', 'unable to drink'],
  ['cannot drink', 'unable to drink'],
  ['drinking poorly', 'drinks poorly'],
  ['very sleepy', 'lethargy'],
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
