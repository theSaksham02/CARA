'use strict';

const { isOllamaAvailable, ollamaGenerate } = require('./llamaService');
const { buildEscalationResponse } = require('./rag/schema');

function buildEvidencePrompt(evidence) {
  return evidence
    .map(
      (chunk, index) => `
Evidence ${index + 1}
id: ${chunk.id}
source_type: ${chunk.metadata.sourceType}
source_id: ${chunk.metadata.sourceId || 'unknown'}
title: ${chunk.metadata.title || 'unknown'}
section: ${chunk.metadata.section || 'unknown'}
timestamp: ${chunk.metadata.timestamp || 'unknown'}
text: ${chunk.text}
`.trim()
    )
    .join('\n\n');
}

function parseModelOutput(rawOutput, validEvidenceIds) {
  try {
    const parsed = JSON.parse(rawOutput);
    const citations = Array.isArray(parsed.citations)
      ? parsed.citations.filter(
          (citation) => citation && typeof citation === 'object' && validEvidenceIds.has(citation.chunk_id)
        )
      : [];

    return {
      answer: String(parsed.answer || '').trim(),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0)),
      citations,
    };
  } catch (_error) {
    return null;
  }
}

function buildFallbackCitationHints(evidence) {
  return evidence.map((chunk) => ({
    chunk_id: chunk.id,
    note: 'Primary evidence considered',
  }));
}

async function generateGroundedAnswer({ question, evidence }) {
  const ollamaStatus = await isOllamaAvailable();
  if (!ollamaStatus.available || !ollamaStatus.model) {
    return buildEscalationResponse({
      reason: 'ollama_unavailable',
      confidence: 0.3,
      citations: buildFallbackCitationHints(evidence),
    });
  }

  const prompt = `
You are a clinical retrieval QA assistant for CARA.
Answer ONLY using the provided evidence.
If evidence is missing or conflicting, respond conservatively and set escalate=true.

Question:
${question}

Evidence:
${buildEvidencePrompt(evidence)}

Return JSON only with keys:
- answer (string)
- confidence (0 to 1 number)
- citations (array of objects with: chunk_id, rationale)
`.trim();

  const validIds = new Set(evidence.map((chunk) => chunk.id));

  try {
    const output = await ollamaGenerate(prompt, { json: true });
    const parsed = parseModelOutput(output, validIds);
    if (!parsed || !parsed.answer || parsed.citations.length === 0) {
      return buildEscalationResponse({
        reason: 'invalid_generation',
        confidence: 0.35,
        citations: buildFallbackCitationHints(evidence),
      });
    }

    return {
      answer: parsed.answer,
      confidence: parsed.confidence,
      citations: parsed.citations,
      escalate: false,
      reason: null,
    };
  } catch (_error) {
    return buildEscalationResponse({
      reason: 'invalid_generation',
      confidence: 0.35,
      citations: buildFallbackCitationHints(evidence),
    });
  }
}

module.exports = {
  generateGroundedAnswer,
};
