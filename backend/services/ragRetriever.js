'use strict';

const { ollamaEmbed } = require('./llamaService');
const { tokenize } = require('./rag/chunker');

const SAFETY_KEYWORDS = new Set([
  'danger',
  'convulsion',
  'breathing',
  'unconscious',
  'dehydration',
  'severe',
  'referral',
  'urgent',
  'fever',
  'pneumonia',
]);

function dotProduct(a, b) {
  let sum = 0;
  for (let index = 0; index < a.length && index < b.length; index += 1) {
    sum += a[index] * b[index];
  }
  return sum;
}

function vectorNorm(values) {
  return Math.sqrt(dotProduct(values, values));
}

function cosineSimilarity(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length === 0 || right.length === 0) {
    return 0;
  }

  const denominator = vectorNorm(left) * vectorNorm(right);
  if (!denominator) {
    return 0;
  }

  return dotProduct(left, right) / denominator;
}

function lexicalScore(queryTokens, chunkTokenSet) {
  if (!queryTokens.length || !chunkTokenSet || chunkTokenSet.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of queryTokens) {
    if (chunkTokenSet.has(token)) {
      overlap += 1;
    }
  }

  return overlap / queryTokens.length;
}

function inferIntent(queryTokens) {
  const hasProtocolHint = queryTokens.some((token) =>
    ['protocol', 'imci', 'guideline', 'rule', 'treat', 'classification'].includes(token)
  );
  const hasTimelineHint = queryTokens.some((token) =>
    ['history', 'previous', 'last', 'followup', 'follow', 'patient'].includes(token)
  );

  return {
    protocol: hasProtocolHint,
    timeline: hasTimelineHint,
  };
}

function recencyBoost(timestamp) {
  if (!timestamp) {
    return 0;
  }

  const ageMs = Math.max(0, Date.now() - new Date(timestamp).getTime());
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return Math.max(0, 0.1 - ageDays * 0.005);
}

function keywordSafetyBoost(queryTokens, chunkTokenSet) {
  let shared = 0;
  for (const token of queryTokens) {
    if (SAFETY_KEYWORDS.has(token) && chunkTokenSet.has(token)) {
      shared += 1;
    }
  }

  return shared * 0.02;
}

function scoreChunk({ queryTokens, queryEmbedding, chunk, intent, patientId }) {
  const lexical = lexicalScore(queryTokens, chunk.tokenSet);
  const vector = queryEmbedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : 0;
  let score = lexical * 0.45 + vector * 0.55;

  if (intent.protocol && chunk.metadata.sourceType === 'protocol') {
    score += 0.08;
  }

  if (intent.timeline && chunk.metadata.sourceType === 'patient_history') {
    score += 0.08;
  }

  if (patientId && chunk.metadata.patientId === patientId) {
    score += 0.05;
  }

  score += recencyBoost(chunk.metadata.timestamp);
  score += keywordSafetyBoost(queryTokens, chunk.tokenSet);

  return {
    ...chunk,
    score,
    debug: {
      lexical: Number(lexical.toFixed(4)),
      vector: Number(vector.toFixed(4)),
    },
  };
}

async function retrieveEvidence({ question, patientId, indexChunks, topK }) {
  const queryTokens = tokenize(question);
  const intent = inferIntent(queryTokens);
  let queryEmbedding = null;
  try {
    queryEmbedding = await ollamaEmbed(question);
  } catch (_error) {
    queryEmbedding = null;
  }

  const candidateChunks = patientId
    ? indexChunks.filter((chunk) => !chunk.metadata.patientId || chunk.metadata.patientId === patientId)
    : indexChunks;

  const scored = candidateChunks
    .map((chunk) =>
      scoreChunk({
        queryTokens,
        queryEmbedding,
        chunk,
        intent,
        patientId,
      })
    )
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, topK);

  return {
    evidence: scored,
    debug: {
      candidates: candidateChunks.length,
      used_embedding: Boolean(queryEmbedding),
    },
  };
}

module.exports = {
  retrieveEvidence,
};
