'use strict';
const express = require('express');
const { query } = require('express-validator');
const { getCHWProfileHandler, getCHWStatsHandler } = require('../controllers/chw.controller');
const router = express.Router();

router.get('/me', getCHWProfileHandler);
router.get('/me/stats', [
  query('range').optional().isIn(['today','week','month'])
], getCHWStatsHandler);

module.exports = router;
