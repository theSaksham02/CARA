'use strict';

const RAG_CONFIDENCE_THRESHOLD = Number(process.env.RAG_CONFIDENCE_THRESHOLD || 0.65);
const RAG_MIN_EVIDENCE_SCORE = Number(process.env.RAG_MIN_EVIDENCE_SCORE || 0.45);
const RAG_DEFAULT_TOP_K = Number(process.env.RAG_DEFAULT_TOP_K || 5);
const RAG_MAX_TOP_K = Number(process.env.RAG_MAX_TOP_K || 8);

const FALLBACK_ANSWERS = Object.freeze({
  insufficientEvidence:
    'I do not have enough trusted protocol or patient-history evidence to answer safely. Please escalate to a clinician review.',
  lowConfidence:
    'The retrieved evidence is not strong enough for a safe answer. Please escalate to a clinician review.',
  generatorUnavailable:
    'Local Ollama generation is unavailable. Please review the cited evidence directly or escalate to a clinician.',
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeQuestion(value) {
  return String(value || '').trim();
}

function normalizeTopK(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return RAG_DEFAULT_TOP_K;
  }

  return clamp(parsed, 1, RAG_MAX_TOP_K);
}

function createCitationFromEvidence(evidence) {
  return {
    chunk_id: evidence.id,
    source_type: evidence.metadata.sourceType,
    source_id: evidence.metadata.sourceId || null,
    patient_id: evidence.metadata.patientId || null,
    title: evidence.metadata.title || 'Untitled evidence',
    section: evidence.metadata.section || null,
    timestamp: evidence.metadata.timestamp || null,
    score: Number(evidence.score.toFixed(4)),
  };
}

function buildEscalationResponse({ reason, confidence, citations = [], answer }) {
  const fallbackByReason = {
    no_evidence: FALLBACK_ANSWERS.insufficientEvidence,
    low_confidence: FALLBACK_ANSWERS.lowConfidence,
    ollama_unavailable: FALLBACK_ANSWERS.generatorUnavailable,
    invalid_generation: FALLBACK_ANSWERS.lowConfidence,
  };

  return {
    answer: answer || fallbackByReason[reason] || FALLBACK_ANSWERS.lowConfidence,
    citations,
    confidence: clamp(Number(confidence) || 0, 0, 1),
    escalate: true,
    reason,
  };
}

function buildSuccessResponse({ answer, citations, confidence }) {
  return {
    answer: String(answer || '').trim(),
    citations,
    confidence: clamp(Number(confidence) || 0, 0, 1),
    escalate: false,
    reason: null,
  };
}

module.exports = {
  FALLBACK_ANSWERS,
  RAG_CONFIDENCE_THRESHOLD,
  RAG_DEFAULT_TOP_K,
  RAG_MAX_TOP_K,
  RAG_MIN_EVIDENCE_SCORE,
  buildEscalationResponse,
  buildSuccessResponse,
  createCitationFromEvidence,
  normalizeQuestion,
  normalizeTopK,
};
