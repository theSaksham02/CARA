'use strict';

const { validationResult } = require('express-validator');

const { getDashboardOverview } = require('../db/setup');

async function getOverview(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const overview = await getDashboardOverview({
      queue_limit: req.query.queue_limit,
    });

    return res.status(200).json({ overview });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getOverview,
};
