'use strict';

const express = require('express');

const { getSyncStatus } = require('../controllers/sync.controller');

const router = express.Router();

router.get('/sync-status', getSyncStatus);

module.exports = router;
