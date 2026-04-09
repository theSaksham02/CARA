const express = require('express');
const router = express.Router();
const { assessTriage } = require('../controllers/triage.controller');

router.post('/assess', assessTriage);

module.exports = router;
'use strict';

const express = require('express');
const { body, query } = require('express-validator');

const { assessTriage, getTriageQueue } = require('../controllers/triage.controller');

const router = express.Router();

router.get(
  '/queue',
  [
    query('urgency').optional().isIn(['RED', 'YELLOW', 'GREEN']).withMessage('urgency must be RED, YELLOW, or GREEN.'),
    query('search').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  ],
  getTriageQueue
);

router.post(
  '/assess',
  [
    body('symptoms')
      .isArray({ min: 1 })
      .withMessage('symptoms must be a non-empty array.'),
    body('symptoms.*').isString().trim().notEmpty().withMessage('each symptom must be a non-empty string.'),
    body('age_months')
      .isInt({ min: 0 })
      .withMessage('age_months must be a non-negative integer.'),
    body('patient_id').optional().isString().trim().notEmpty(),
    body('transcript').optional().isString(),
    body('metadata').optional().isObject(),
  ],
  assessTriage
);

module.exports = router;
