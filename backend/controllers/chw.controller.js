'use strict';
const { validationResult } = require('express-validator');
const { getCHWProfile, getCHWStats } = require('../db/setup');

async function getCHWProfileHandler(req, res, next) {
  try {
    const profile = await getCHWProfile(req.user.id);
    return res.status(200).json({ profile: profile || { id: req.user.id, display_name: req.user.email } });
  } catch (error) { return next(error); }
}

async function getCHWStatsHandler(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const stats = await getCHWStats(req.user.id, req.query.range || 'week');
    return res.status(200).json({ stats });
  } catch (error) { return next(error); }
}

module.exports = { getCHWProfileHandler, getCHWStatsHandler };
