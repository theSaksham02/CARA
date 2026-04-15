'use strict';

const express = require('express');
const { body } = require('express-validator');

const { buildRagIndex, getRagIndexStatus, queryRag } = require('../controllers/rag.controller');

const router = express.Router();

router.get('/index/status', getRagIndexStatus);

router.post(
  '/index/build',
  [
    body('patient_id').optional().isString().trim().notEmpty(),
    body('persist').optional().isBoolean().withMessage('persist must be boolean.'),
  ],
  buildRagIndex
);

router.post(
  '/index/refresh',
  [
    body('patient_id').optional().isString().trim().notEmpty(),
    body('persist').optional().isBoolean().withMessage('persist must be boolean.'),
  ],
  buildRagIndex
);

router.post(
  '/query',
  [
    body('question').isString().trim().notEmpty().withMessage('question is required.'),
    body('patient_id').optional().isString().trim().notEmpty(),
    body('top_k').optional().isInt({ min: 1, max: 8 }).withMessage('top_k must be between 1 and 8.'),
  ],
  queryRag
);

module.exports = router;
