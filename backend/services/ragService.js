'use strict';

const { generateGroundedAnswer } = require('./ragGenerator');
const { buildRagIndex, ensureRagIndexLoaded } = require('./ragIndexer');
const { retrieveEvidence } = require('./ragRetriever');
const { getIndexStatus } = require('./rag/ragIndexStore');
const {
  RAG_CONFIDENCE_THRESHOLD,
  RAG_MIN_EVIDENCE_SCORE,
  buildEscalationResponse,
  buildSuccessResponse,
  createCitationFromEvidence,
  normalizeQuestion,
  normalizeTopK,
} = require('./rag/schema');

async function queryRagMemory(payload = {}) {
  const question = normalizeQuestion(payload.question);
  const patientId = payload.patient_id || payload.patientId || null;
  const topK = normalizeTopK(payload.top_k || payload.topK);

  const index = await ensureRagIndexLoaded();
  const retrieval = await retrieveEvidence({
    question,
    patientId,
    indexChunks: index.chunks,
    topK,
  });

  if (!retrieval.evidence.length) {
    return buildEscalationResponse({
      reason: 'no_evidence',
      confidence: 0,
      citations: [],
    });
  }

  const generatorOutput = await generateGroundedAnswer({
    question,
    evidence: retrieval.evidence,
  });

  const citationsById = new Map(retrieval.evidence.map((item) => [item.id, item]));
  const mappedCitations = (generatorOutput.citations || [])
    .map((citation) => citationsById.get(citation.chunk_id))
    .filter(Boolean)
    .map(createCitationFromEvidence);

  const topEvidenceScore = retrieval.evidence[0]?.score || 0;
  const confidence = Math.min(1, Math.max(0, Number(generatorOutput.confidence) || 0));

  if (
    generatorOutput.escalate ||
    mappedCitations.length === 0 ||
    topEvidenceScore < RAG_MIN_EVIDENCE_SCORE ||
    confidence < RAG_CONFIDENCE_THRESHOLD
  ) {
    const reason =
      generatorOutput.reason ||
      (mappedCitations.length === 0 ? 'no_evidence' : confidence < RAG_CONFIDENCE_THRESHOLD ? 'low_confidence' : 'low_confidence');

    return buildEscalationResponse({
      reason,
      confidence,
      citations: retrieval.evidence.map(createCitationFromEvidence),
      answer: generatorOutput.answer,
    });
  }

  return buildSuccessResponse({
    answer: generatorOutput.answer,
    citations: mappedCitations,
    confidence,
  });
}

async function buildIndex(payload = {}) {
  const index = await buildRagIndex({
    patientId: payload.patient_id || payload.patientId || null,
    persist: payload.persist !== false,
  });

  return {
    built_at: index.builtAt,
    stats: index.stats,
  };
}

function getRagStatus() {
  return getIndexStatus();
}

module.exports = {
  buildIndex,
  getRagStatus,
  queryRagMemory,
};
