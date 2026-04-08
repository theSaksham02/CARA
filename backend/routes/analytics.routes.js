'use strict';

const express = require('express');
const { query } = require('express-validator');

const { getImpact } = require('../controllers/analytics.controller');

const router = express.Router();

router.get(
  '/',
  [query('range').optional().isIn(['today', 'week', 'month']).withMessage('range must be today, week, or month.')],
  getImpact
);

module.exports = router;
