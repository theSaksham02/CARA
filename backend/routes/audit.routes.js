'use strict';

const express = require('express');
const { query } = require('express-validator');

const { getAuditEvents } = require('../controllers/audit.controller');

const router = express.Router();

router.get(
  '/',
  [
    query('actor_id').optional().isString().trim().notEmpty(),
    query('event_type').optional().isIn(['read', 'write']).withMessage('event_type must be read or write.'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  ],
  getAuditEvents
);

module.exports = router;
