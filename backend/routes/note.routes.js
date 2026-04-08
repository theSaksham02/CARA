'use strict';

const express = require('express');
const { body } = require('express-validator');

const { generateSoapNote } = require('../controllers/note.controller');

const router = express.Router();

router.post(
  '/generate',
  [
    body('transcript').isString().trim().notEmpty().withMessage('transcript is required.'),
    body('patient_id').optional().isString().trim().notEmpty(),
  ],
  generateSoapNote
);

module.exports = router;
