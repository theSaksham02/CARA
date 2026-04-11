'use strict';

const express = require('express');
const { body } = require('express-validator');

const { transcribeAndGenerateNote } = require('../controllers/voice.controller');

const router = express.Router();

router.post(
  '/transcribe',
  [
    body('audio_base64')
      .isString()
      .notEmpty()
      .withMessage('audio_base64 must be a non-empty base64-encoded string.'),
    body('language')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 10 })
      .withMessage('language must be a valid ISO 639-1 code.'),
    body('patient_id').optional().isString().trim().notEmpty(),
    body('format')
      .optional()
      .isIn(['wav', 'mp3', 'flac', 'ogg', 'webm', 'm4a'])
      .withMessage('format must be wav, mp3, flac, ogg, webm, or m4a.'),
  ],
  transcribeAndGenerateNote
);

module.exports = router;
