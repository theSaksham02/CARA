'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');

const { generateSoapNote, getSoapNoteById, getSoapNotes } = require('../controllers/note.controller');

const router = express.Router();

router.get(
  '/',
  [
    query('patient_id').optional().isString().trim().notEmpty(),
    query('search').optional().isString().trim(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100.'),
  ],
  getSoapNotes
);

router.get(
  '/:note_id',
  [param('note_id').isString().trim().notEmpty().withMessage('note_id is required.')],
  getSoapNoteById
);

router.post(
  '/generate',
  [
    body('transcript').isString().trim().notEmpty().withMessage('transcript is required.'),
    body('patient_id').optional().isString().trim().notEmpty(),
  ],
  generateSoapNote
);

module.exports = router;
