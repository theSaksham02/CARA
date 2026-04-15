'use strict';

const path = require('node:path');

const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');

const analyticsRoutes = require('./routes/analytics.routes');
const assistantRoutes = require('./routes/assistant.routes');
const auditRoutes = require('./routes/audit.routes');
const { bootstrapDatabase, getDbMode } = require('./db/setup');
const { auditMiddleware } = require('./middleware/audit.middleware');
const { authMiddleware, getAuthMode } = require('./middleware/auth.middleware');
const dashboardRoutes = require('./routes/dashboard.routes');
const followupRoutes = require('./routes/followup.routes');
const noteRoutes = require('./routes/note.routes');
const patientRoutes = require('./routes/patient.routes');
const publicRoutes = require('./routes/public.routes');
const ragRoutes = require('./routes/rag.routes');
const readmissionRoutes = require('./routes/readmission.routes');
const syncRoutes = require('./routes/sync.routes');
const triageRoutes = require('./routes/triage.routes');
const voiceRoutes = require('./routes/voice.routes');

dotenv.config({ path: path.resolve(__dirname, '.env') });

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    })
  );
  app.use(express.json());
  app.use(auditMiddleware);

  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'ok',
      db_mode: getDbMode(),
      auth_mode: getAuthMode(),
    });
  });

  app.use('/public', publicRoutes);
  app.use('/api', authMiddleware);
  app.use('/api/assistant', assistantRoutes);
  app.use('/api/triage', triageRoutes);
  app.use('/api/patients', patientRoutes);
  app.use('/api/notes', noteRoutes);
  app.use('/api/voice', voiceRoutes);
  app.use('/api/readmission', readmissionRoutes);
  app.use('/api/rag', ragRoutes);
  app.use('/api/followup', followupRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/analytics/impact', analyticsRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api', syncRoutes);

  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  app.use((error, _req, res, _next) => {
    if (process.env.NODE_ENV !== 'test') {
      console.error(error);
    }

    res.status(error.statusCode || 500).json({
      error: error.message || 'Internal server error.',
    });
  });

  return app;
}

async function startServer() {
  await bootstrapDatabase();

  const app = createApp();
  const port = Number(process.env.PORT || 4000);
  app.listen(port, () => {
    console.log(`CARA backend listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error('Failed to start CARA backend:', error);
    process.exit(1);
  });
}

module.exports = {
  createApp,
  startServer,
};
