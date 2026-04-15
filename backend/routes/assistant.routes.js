'use strict';

const express = require('express');
const { body, query } = require('express-validator');

const { askAssistant, getAssistantLogs } = require('../controllers/assistant.controller');

const router = express.Router();

router.get(
  '/logs',
  [
    query('patient_id').optional().isString().trim().notEmpty(),
    query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200.'),
  ],
  getAssistantLogs
);

router.post(
  '/',
  [
    body('question').isString().trim().notEmpty().withMessage('question is required.'),
    body('patient_id').optional().isString().trim().notEmpty(),
    body('top_k').optional().isInt({ min: 1, max: 8 }).withMessage('top_k must be between 1 and 8.'),
  ],
  askAssistant
);

module.exports = router;
