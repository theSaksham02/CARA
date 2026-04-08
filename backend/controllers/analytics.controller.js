'use strict';

const { validationResult } = require('express-validator');

const { getImpactAnalytics } = require('../db/setup');

async function getImpact(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const analytics = await getImpactAnalytics(req.query.range);
    return res.status(200).json({ analytics });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getImpact,
};
