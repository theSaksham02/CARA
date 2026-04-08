'use strict';

const express = require('express');
const { query } = require('express-validator');

const { getOverview } = require('../controllers/dashboard.controller');

const router = express.Router();

router.get(
  '/overview',
  [query('queue_limit').optional().isInt({ min: 1, max: 20 }).withMessage('queue_limit must be between 1 and 20.')],
  getOverview
);

module.exports = router;
