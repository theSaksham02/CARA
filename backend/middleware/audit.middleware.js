'use strict';

const { insertAuditEvent } = require('../db/setup');

function sanitizeAuditValue(value) {
  if (typeof value === 'string') {
    if (value.length <= 160) {
      return value;
    }

    return `${value.slice(0, 157)}...`;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 10).map(sanitizeAuditValue);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['transcript', 'note', 'body', 'token', 'authorization'].includes(key))
      .map(([key, entryValue]) => [key, sanitizeAuditValue(entryValue)])
  );
}

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
          body_keys:
            req.method === 'GET' || !req.body || typeof req.body !== 'object'
              ? []
              : Object.keys(req.body),
          body_preview: req.method === 'GET' ? undefined : sanitizeAuditValue(req.body),
          query: sanitizeAuditValue(req.query),
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
  sanitizeAuditValue,
};
