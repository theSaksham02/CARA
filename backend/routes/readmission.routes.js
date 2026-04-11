'use strict';

const express = require('express');
const { body, query } = require('express-validator');

const { predictReadmission, getReadmissionRecords } = require('../controllers/readmission.controller');

const router = express.Router();

router.post(
  '/predict',
  [
    body('patient_id')
      .isString()
      .trim()
      .notEmpty()
      .withMessage('patient_id is required.'),
    body('condition')
      .isString()
      .trim()
      .isIn(['TB', 'HIV', 'DIABETES', 'tb', 'hiv', 'diabetes'])
      .withMessage('condition must be TB, HIV, or DIABETES.'),
    body('history')
      .isArray()
      .withMessage('history must be an array of visit records.'),
    body('age_years')
      .optional()
      .isInt({ min: 0, max: 150 })
      .withMessage('age_years must be a non-negative integer.'),
  ],
  predictReadmission
);

router.get(
  '/',
  [
    query('condition')
      .optional()
      .isIn(['TB', 'HIV', 'DIABETES', 'tb', 'hiv', 'diabetes'])
      .withMessage('condition must be TB, HIV, or DIABETES.'),
    query('risk_level')
      .optional()
      .isIn(['HIGH', 'MEDIUM', 'LOW'])
      .withMessage('risk_level must be HIGH, MEDIUM, or LOW.'),
    query('patient_id').optional().isString().trim(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('limit must be between 1 and 100.'),
  ],
  getReadmissionRecords
);

module.exports = router;
