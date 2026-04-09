'use strict';

const fs = require('node:fs');
const path = require('node:path');

const externalProtocolPath = path.resolve(__dirname, '../ml/protocols/imci.json');
const validUrgencies = new Set(['RED', 'YELLOW', 'GREEN']);

const fallbackProtocols = {
  version: '1.0.0',
  source: 'backend-fallback',
  default_action: 'Provide home care guidance and routine follow-up.',
  rules: [
    {
      id: 'danger-sign-red',
      priority: 100,
      symptomsAny: [
        'unable to drink',
        'vomiting everything',
        'convulsions',
        'lethargy',
        'unconscious',
        'difficulty breathing',
        'chest indrawing',
      ],
      urgency: 'RED',
      recommended_action: 'Urgent referral to the nearest clinician or hospital.',
      reason: 'A WHO danger sign is present and requires urgent escalation.',
    },
    {
      id: 'pneumonia-yellow',
      priority: 80,
      symptomsAll: ['cough'],
      symptomsAny: ['fast breathing', 'difficulty breathing', 'breathing issues'],
      urgency: 'YELLOW',
      recommended_action: 'Arrange same-day clinician review for possible pneumonia.',
      reason: 'Cough with breathing symptoms matches the prototype pneumonia pathway.',
    },
    {
      id: 'diarrhoea-dehydration-yellow',
      priority: 70,
      symptomsAll: ['diarrhoea'],
      symptomsAny: ['sunken eyes', 'restless', 'drinks poorly', 'dry mouth'],
      urgency: 'YELLOW',
      recommended_action: 'Start oral rehydration guidance and arrange clinician review.',
      reason: 'Diarrhoea with dehydration features needs prompt follow-up care.',
    },
    {
      id: 'malaria-fever-yellow',
      priority: 60,
      symptomsAll: ['fever'],
      symptomsAny: ['chills', 'hot body', 'malaria exposure', 'body aches'],
      urgency: 'YELLOW',
      recommended_action: 'Refer for same-day malaria or fever assessment.',
      reason: 'Fever with malaria-like features requires clinical review.',
    },
    {
      id: 'mild-fever-green',
      priority: 30,
      symptomsAll: ['fever'],
      urgency: 'GREEN',
      recommended_action: 'Provide home monitoring advice and routine follow-up.',
      reason: 'Isolated fever without danger signs can be monitored closely.',
    },
    {
      id: 'mild-cough-green',
      priority: 20,
      symptomsAll: ['cough'],
      urgency: 'GREEN',
      recommended_action: 'Provide supportive care advice and routine follow-up.',
      reason: 'Isolated cough without breathing difficulty is lower urgency.',
    },
  ],
};

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizeString(value) {
  return String(value || '').trim();
}

function normalizeStringArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error('must be an array of strings.');
  }

  const normalized = value
    .map((entry) => normalizeString(entry))
    .filter(Boolean);

  if (normalized.length !== value.length) {
    throw new Error('must only contain non-empty strings.');
  }

  return [...new Set(normalized)];
}

function normalizeRule(rule, index) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    throw new Error(`Rule ${index + 1} must be an object.`);
  }

  const id = normalizeString(rule.id);
  const urgency = normalizeString(rule.urgency).toUpperCase();
  const reason = normalizeString(rule.reason);
  const recommendedAction = normalizeString(rule.recommended_action);
  const symptomsAll = normalizeStringArray(rule.symptomsAll);
  const symptomsAny = normalizeStringArray(rule.symptomsAny);
  const priority = Number.isFinite(rule.priority) ? Number(rule.priority) : 0;
  const minAgeMonths =
    rule.min_age_months === undefined || rule.min_age_months === null
      ? undefined
      : Number(rule.min_age_months);
  const maxAgeMonths =
    rule.max_age_months === undefined || rule.max_age_months === null
      ? undefined
      : Number(rule.max_age_months);

  if (!id) {
    throw new Error(`Rule ${index + 1} is missing a non-empty id.`);
  }

  if (!validUrgencies.has(urgency)) {
    throw new Error(`Rule "${id}" must use urgency RED, YELLOW, or GREEN.`);
  }

  if (!reason) {
    throw new Error(`Rule "${id}" is missing a non-empty reason.`);
  }

  if (!recommendedAction) {
    throw new Error(`Rule "${id}" is missing a non-empty recommended_action.`);
  }

  if (!Number.isFinite(priority)) {
    throw new Error(`Rule "${id}" must define a numeric priority.`);
  }

  if (symptomsAll.length === 0 && symptomsAny.length === 0) {
    throw new Error(`Rule "${id}" must define symptomsAll, symptomsAny, or both.`);
  }

  if (minAgeMonths !== undefined && (!Number.isInteger(minAgeMonths) || minAgeMonths < 0)) {
    throw new Error(`Rule "${id}" must use a non-negative integer min_age_months when provided.`);
  }

  if (maxAgeMonths !== undefined && (!Number.isInteger(maxAgeMonths) || maxAgeMonths < 0)) {
    throw new Error(`Rule "${id}" must use a non-negative integer max_age_months when provided.`);
  }

  if (
    minAgeMonths !== undefined &&
    maxAgeMonths !== undefined &&
    minAgeMonths > maxAgeMonths
  ) {
    throw new Error(`Rule "${id}" cannot have min_age_months greater than max_age_months.`);
  }

  return {
    id,
    priority,
    symptomsAll,
    symptomsAny,
    urgency,
    recommended_action: recommendedAction,
    reason,
    ...(minAgeMonths === undefined ? {} : { min_age_months: minAgeMonths }),
    ...(maxAgeMonths === undefined ? {} : { max_age_months: maxAgeMonths }),
  };
}

function validateProtocols(protocols) {
  if (!protocols || typeof protocols !== 'object' || Array.isArray(protocols)) {
    throw new Error('Protocol bundle must be an object.');
  }

  const defaultAction = normalizeString(protocols.default_action);
  if (!defaultAction) {
    throw new Error('Protocol bundle must define a non-empty default_action.');
  }

  if (!Array.isArray(protocols.rules) || protocols.rules.length === 0) {
    throw new Error('Protocol bundle must define a non-empty rules array.');
  }

  const normalizedRules = protocols.rules.map((rule, index) => normalizeRule(rule, index));
  const duplicateRuleId = normalizedRules.find(
    (rule, index) => normalizedRules.findIndex((entry) => entry.id === rule.id) !== index
  );

  if (duplicateRuleId) {
    throw new Error(`Duplicate protocol rule id "${duplicateRuleId.id}" detected.`);
  }

  return {
    version: isNonEmptyString(protocols.version) ? protocols.version.trim() : '1.0.0',
    source: isNonEmptyString(protocols.source) ? protocols.source.trim() : 'external-imci',
    default_action: defaultAction,
    rules: normalizedRules,
  };
}

function applyDemoRuleLimit(validated) {
  const DEMO_RULE_LIMIT = process.env.DEMO_RULE_LIMIT
    ? parseInt(process.env.DEMO_RULE_LIMIT, 10)
    : null;

  if (DEMO_RULE_LIMIT && Number.isFinite(DEMO_RULE_LIMIT)) {
    validated.rules = validated.rules
      .sort((a, b) => b.priority - a.priority)
      .slice(0, DEMO_RULE_LIMIT);
  }

  return validated;
}

function loadProtocols() {
  try {
    if (!fs.existsSync(externalProtocolPath)) {
      return applyDemoRuleLimit(validateProtocols(fallbackProtocols));
    }

    const rawValue = fs.readFileSync(externalProtocolPath, 'utf8').trim();
    if (!rawValue) {
      return applyDemoRuleLimit(validateProtocols(fallbackProtocols));
    }

    const parsedValue = JSON.parse(rawValue);
    return applyDemoRuleLimit(validateProtocols(parsedValue));
  } catch (error) {
    if (fs.existsSync(externalProtocolPath)) {
      throw new Error(`Invalid IMCI protocol bundle: ${error.message}`);
    }

    return applyDemoRuleLimit(validateProtocols(fallbackProtocols));
  }
}

module.exports = {
  fallbackProtocols,
  loadProtocols,
  validateProtocols,
};
