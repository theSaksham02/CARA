'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');

const {
  createPatientRecord,
  getCurrentPatientVisitSummary,
  deletePatientRecord,
  getPatients,
  getPatientVisitSummary,
  updatePatientRecord,
} = require('../controllers/patient.controller');

const router = express.Router();

router.get(
  '/me/summary',
  [query('patient_id').optional().isString().trim().notEmpty()],
  getCurrentPatientVisitSummary
);

router.get(
  '/:patient_id/summary',
  [param('patient_id').isString().trim().notEmpty().withMessage('patient_id is required.')],
  getPatientVisitSummary
);

router.get('/', getPatients);

router.post(
  '/',
  [
    body('full_name').isString().trim().notEmpty().withMessage('full_name is required.'),
    body('age_months').isInt({ min: 0 }).withMessage('age_months must be a non-negative integer.'),
    body('caregiver_name').optional().isString(),
    body('sex').optional().isString(),
    body('village').optional().isString(),
  ],
  createPatientRecord
);

router.put(
  '/:patient_id',
  [
    param('patient_id').isString().trim().notEmpty().withMessage('patient_id is required.'),
    body('full_name').optional().isString().trim().notEmpty(),
    body('age_months').optional().isInt({ min: 0 }),
    body('caregiver_name').optional().isString(),
    body('sex').optional().isString(),
    body('village').optional().isString(),
  ],
  updatePatientRecord
);

router.delete(
  '/:patient_id',
  [param('patient_id').isString().trim().notEmpty().withMessage('patient_id is required.')],
  deletePatientRecord
);

module.exports = router;
