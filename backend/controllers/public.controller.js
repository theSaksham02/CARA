'use strict';

const { validationResult } = require('express-validator');

const { createContactSubmission } = require('../db/setup');

async function submitJoinUs(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const submission = await createContactSubmission({
      name: req.body.name,
      email: req.body.email,
      role: req.body.role,
      message: req.body.message,
      metadata: req.body.metadata || {},
    });

    return res.status(201).json({
      submission: {
        id: submission.id,
        status: submission.status,
      },
      message: 'Thanks for reaching out. Our team will contact you soon.',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  submitJoinUs,
};
