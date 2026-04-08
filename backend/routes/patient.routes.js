'use strict';

const express = require('express');
const { body } = require('express-validator');

const { createPatientRecord, getPatients } = require('../controllers/patient.controller');

const router = express.Router();

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

module.exports = router;
