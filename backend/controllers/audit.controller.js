'use strict';

const { validationResult } = require('express-validator');

const { listAuditEvents } = require('../db/setup');

async function getAuditEvents(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const events = await listAuditEvents({
      actor_id: req.query.actor_id,
      event_type: req.query.event_type,
      limit: req.query.limit,
    });

    return res.status(200).json({ events });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAuditEvents,
};
