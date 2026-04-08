'use strict';

const express = require('express');
const { body } = require('express-validator');

const { assessTriage } = require('../controllers/triage.controller');

const router = express.Router();

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
