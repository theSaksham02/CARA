'use strict';

const { getSyncStatusData } = require('../db/setup');
const { getWhisperStatus } = require('../services/whisperService');
const { isOllamaAvailable } = require('../services/llamaService');

async function getSyncStatus(_req, res, next) {
  try {
    const [syncData, whisperStatus, ollamaStatus] = await Promise.all([
      getSyncStatusData(),
      getWhisperStatus(),
      isOllamaAvailable(),
    ]);

    return res.status(200).json({
      online: syncData.online,
      last_sync: syncData.last_sync,
      pending_records: syncData.pending_records,
      db_mode: syncData.db_mode,
      services: {
        whisper: whisperStatus,
        ollama: {
          available: ollamaStatus.available,
          model: ollamaStatus.model || null,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSyncStatus,
};
