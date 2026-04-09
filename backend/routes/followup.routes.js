const express = require('express');
const router = express.Router();
const { getFollowups, scheduleFollowup } = require('../controllers/followup.controller');

router.get('/', getFollowups);
router.post('/', scheduleFollowup);

module.exports = router;
'use strict';

const express = require('express');
const { body, query } = require('express-validator');

const { createFollowupRecord, getFollowups } = require('../controllers/followup.controller');

const router = express.Router();

router.get(
  '/',
  [
    query('patient_id').optional().isString().trim().notEmpty(),
    query('status').optional().isString().trim().notEmpty(),
  ],
  getFollowups
);

router.post(
  '/',
  [
    body('patient_id').isString().trim().notEmpty().withMessage('patient_id is required.'),
    body('due_date').isISO8601().withMessage('due_date must be an ISO-8601 date.'),
    body('instructions').isString().trim().notEmpty().withMessage('instructions are required.'),
    body('urgency').optional().isString().trim().notEmpty(),
    body('status').optional().isString().trim().notEmpty(),
  ],
  createFollowupRecord
);

module.exports = router;
