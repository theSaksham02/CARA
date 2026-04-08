'use strict';

const fs = require('node:fs');
const path = require('node:path');

const externalFormatterPath = path.resolve(__dirname, '../ml/soap/soap_formatter.js');

const fallbackKeywords = {
  subjective: ['reports', 'complains', 'mother says', 'caregiver says', 'history', 'fever', 'cough', 'pain'],
  objective: ['temperature', 'pulse', 'observed', 'measured', 'exam', 'weight'],
  assessment: ['likely', 'possible', 'assessment', 'diagnosis', 'impression', 'suspect'],
  plan: ['plan', 'advise', 'refer', 'follow up', 'follow-up', 'monitor', 'review'],
};

function splitTranscriptIntoSentences(transcript) {
  return String(transcript || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .map((sentence) => sentence.replace(/[.!?]+$/, ''))
    .filter(Boolean);
}

function sentenceMatches(sentence, bucketKeywords) {
  const normalizedSentence = sentence.toLowerCase();
  return bucketKeywords.some((keyword) => normalizedSentence.includes(keyword));
}

function classifySentence(sentence) {
  if (sentenceMatches(sentence, fallbackKeywords.plan)) {
    return 'plan';
  }

  if (sentenceMatches(sentence, fallbackKeywords.assessment)) {
    return 'assessment';
  }

  if (sentenceMatches(sentence, fallbackKeywords.objective)) {
    return 'objective';
  }

  return 'subjective';
}

function fallbackFormatSoapNote(transcript) {
  const sections = {
    subjective: [],
    objective: [],
    assessment: [],
    plan: [],
  };

  for (const sentence of splitTranscriptIntoSentences(transcript)) {
    sections[classifySentence(sentence)].push(sentence);
  }

  return sections;
}

function loadExternalFormatter() {
  try {
    if (!fs.existsSync(externalFormatterPath)) {
      return null;
    }

    const stats = fs.statSync(externalFormatterPath);
    if (!stats.isFile() || stats.size === 0) {
      return null;
    }

    const externalModule = require(externalFormatterPath);
    if (typeof externalModule.formatSoapNote === 'function') {
      return externalModule.formatSoapNote;
    }

    return null;
  } catch (_error) {
    return null;
  }
}

function formatSoapNote(transcript) {
  const externalFormatter = loadExternalFormatter();
  if (externalFormatter) {
    return externalFormatter(transcript);
  }

  return fallbackFormatSoapNote(transcript);
}

module.exports = {
  fallbackFormatSoapNote,
  formatSoapNote,
  splitTranscriptIntoSentences,
};
