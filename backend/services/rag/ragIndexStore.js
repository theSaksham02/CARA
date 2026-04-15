'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const { tokenize } = require('./chunker');

const RAG_INDEX_FILE = process.env.RAG_INDEX_FILE || path.resolve(__dirname, '../../data/rag-index.json');

const store = {
  chunks: [],
  builtAt: null,
  stats: {
    protocol_chunks: 0,
    patient_chunks: 0,
    total_chunks: 0,
  },
};

function normalizeChunk(chunk) {
  return {
    ...chunk,
    tokenSet: chunk.tokenSet instanceof Set ? chunk.tokenSet : new Set(tokenize(chunk.text)),
    embedding: Array.isArray(chunk.embedding) ? chunk.embedding.map(Number) : null,
  };
}

function setIndex(chunks, stats = {}) {
  store.chunks = chunks.map(normalizeChunk);
  store.builtAt = new Date().toISOString();
  store.stats = {
    protocol_chunks: Number(stats.protocol_chunks) || 0,
    patient_chunks: Number(stats.patient_chunks) || 0,
    total_chunks: store.chunks.length,
  };
}

function getIndex() {
  return {
    chunks: store.chunks,
    builtAt: store.builtAt,
    stats: store.stats,
  };
}

function getIndexStatus() {
  return {
    ready: store.chunks.length > 0,
    built_at: store.builtAt,
    stats: store.stats,
  };
}

async function persistIndex(filePath = RAG_INDEX_FILE) {
  const payload = {
    builtAt: store.builtAt,
    stats: store.stats,
    chunks: store.chunks.map((chunk) => ({
      ...chunk,
      tokenSet: undefined,
    })),
  };

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

async function loadIndexFromDisk(filePath = RAG_INDEX_FILE) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    store.chunks = (parsed.chunks || []).map(normalizeChunk);
    store.builtAt = parsed.builtAt || null;
    store.stats = parsed.stats || {
      protocol_chunks: 0,
      patient_chunks: 0,
      total_chunks: store.chunks.length,
    };
    return true;
  } catch (_error) {
    return false;
  }
}

function clearIndex() {
  store.chunks = [];
  store.builtAt = null;
  store.stats = {
    protocol_chunks: 0,
    patient_chunks: 0,
    total_chunks: 0,
  };
}

module.exports = {
  RAG_INDEX_FILE,
  clearIndex,
  getIndex,
  getIndexStatus,
  loadIndexFromDisk,
  persistIndex,
  setIndex,
};
