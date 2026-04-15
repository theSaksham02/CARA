'use strict';

const express = require('express');
const { body } = require('express-validator');

const { submitJoinUs } = require('../controllers/public.controller');

const router = express.Router();

router.post(
  '/join-us',
  [
    body('name').isString().trim().notEmpty().withMessage('name is required.'),
    body('email').isEmail().withMessage('email must be valid.'),
    body('role').isString().trim().notEmpty().withMessage('role is required.'),
    body('message').isString().trim().notEmpty().withMessage('message is required.'),
    body('metadata').optional().isObject(),
  ],
  submitJoinUs
);

module.exports = router;
