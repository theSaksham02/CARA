'use strict';

const fs = require('node:fs');
const path = require('node:path');

const externalProtocolPath = path.resolve(__dirname, '../ml/protocols/imci.json');

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

function loadProtocols() {
  try {
    if (!fs.existsSync(externalProtocolPath)) {
      return fallbackProtocols;
    }

    const rawValue = fs.readFileSync(externalProtocolPath, 'utf8').trim();
    if (!rawValue) {
      return fallbackProtocols;
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue.rules) || parsedValue.rules.length === 0) {
      return fallbackProtocols;
    }

    return parsedValue;
  } catch (_error) {
    return fallbackProtocols;
  }
}

module.exports = {
  fallbackProtocols,
  loadProtocols,
};
