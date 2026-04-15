'use strict';

const { ollamaEmbed } = require('./llamaService');
const { buildPatientMemoryChunks } = require('./rag/patientAdapter');
const { buildProtocolChunks } = require('./rag/protocolAdapter');
const { getIndex, loadIndexFromDisk, persistIndex, setIndex } = require('./rag/ragIndexStore');

async function embedChunks(chunks) {
  const output = [];

  for (const chunk of chunks) {
    let embedding = null;
    try {
      embedding = await ollamaEmbed(chunk.text);
    } catch (_error) {
      embedding = null;
    }

    output.push({
      ...chunk,
      embedding,
    });
  }

  return output;
}

async function buildRagIndex(options = {}) {
  const [protocol, patient] = await Promise.all([
    Promise.resolve(buildProtocolChunks(options.protocolPath)),
    buildPatientMemoryChunks({ patientId: options.patientId }),
  ]);

  const combined = [...protocol.chunks, ...patient.chunks];
  const embedded = await embedChunks(combined);

  setIndex(embedded, {
    protocol_chunks: protocol.chunks.length,
    patient_chunks: patient.chunks.length,
  });

  if (options.persist !== false) {
    await persistIndex();
  }

  return getIndex();
}

async function ensureRagIndexLoaded() {
  const index = getIndex();
  if (index.chunks.length > 0) {
    return index;
  }

  const loaded = await loadIndexFromDisk();
  if (loaded) {
    return getIndex();
  }

  return buildRagIndex({ persist: true });
}

module.exports = {
  buildRagIndex,
  ensureRagIndexLoaded,
};
