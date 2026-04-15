'use strict';

const { createHash } = require('node:crypto');

const DEFAULT_CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE || 500);
const DEFAULT_OVERLAP_SIZE = Number(process.env.RAG_CHUNK_OVERLAP || 80);

function stableChunkId(parts) {
  const digest = createHash('sha256')
    .update(parts.map((part) => String(part || '')).join('::'))
    .digest('hex');

  return `rag_${digest.slice(0, 16)}`;
}

function normalizeWhitespace(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter(Boolean);
}

function chunkText(text, options = {}) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) {
    return [];
  }

  const chunkSize = Number(options.chunkSize) || DEFAULT_CHUNK_SIZE;
  const overlap = Number(options.overlap) || DEFAULT_OVERLAP_SIZE;
  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const nextSlice = normalized.slice(cursor, cursor + chunkSize);
    if (!nextSlice) {
      break;
    }

    chunks.push(nextSlice.trim());

    if (cursor + chunkSize >= normalized.length) {
      break;
    }

    cursor += Math.max(1, chunkSize - overlap);
  }

  return chunks;
}

function createChunkRecords({ sourceType, sourceId, patientId, title, section, text, timestamp }) {
  const chunks = chunkText(text);

  return chunks.map((chunkTextValue, index) => ({
    id: stableChunkId([sourceType, sourceId, patientId, section, index, chunkTextValue]),
    text: chunkTextValue,
    tokenSet: new Set(tokenize(chunkTextValue)),
    metadata: {
      sourceType,
      sourceId,
      patientId: patientId || null,
      title: title || null,
      section: section || null,
      timestamp: timestamp || null,
      chunkIndex: index,
    },
  }));
}

module.exports = {
  chunkText,
  createChunkRecords,
  normalizeWhitespace,
  stableChunkId,
  tokenize,
};
