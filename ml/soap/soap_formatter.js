'use strict';
const keywords = require('./keywords.json');

function splitSentences(text) {
  return String(text || '')
    .split(/(?<=[.!?])\s+|,\s*(?=[A-Z])|\n+/)
    .map(s => s.trim())
    .map(s => s.replace(/[.!?]+$/, ''))
    .filter(Boolean);
}

function classifySentence(sentence) {
  const s = sentence.toLowerCase();
  if (keywords.plan.some(k => s.includes(k)))       return 'plan';
  if (keywords.assessment.some(k => s.includes(k))) return 'assessment';
  if (keywords.objective.some(k => s.includes(k)))  return 'objective';
  return 'subjective';
}

function formatSoapNote(transcript) {
  const sections = { subjective: [], objective: [], assessment: [], plan: [] };
  for (const sentence of splitSentences(transcript)) {
    sections[classifySentence(sentence)].push(sentence);
  }
  return sections;
}

module.exports = { formatSoapNote };
