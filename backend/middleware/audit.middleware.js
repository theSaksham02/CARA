'use strict';

const { insertAuditEvent } = require('../db/setup');

function auditMiddleware(req, res, next) {
  res.on('finish', async () => {
    if (req.path === '/health') {
      return;
    }

    try {
      await insertAuditEvent({
        event_type: req.method === 'GET' ? 'read' : 'write',
        method: req.method,
        route: req.originalUrl,
        status_code: res.statusCode,
        actor_id: req.user?.id || null,
        payload: {
          body: req.method === 'GET' ? undefined : req.body,
          query: req.query,
        },
      });
    } catch (error) {
      if (process.env.NODE_ENV !== 'test') {
        console.error('Failed to persist audit event:', error.message);
      }
    }
  });

  next();
}

module.exports = {
  auditMiddleware,
};
