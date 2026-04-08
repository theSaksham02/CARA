'use strict';

const { validationResult } = require('express-validator');

const { createFollowup, findPatientById, listFollowups } = require('../db/setup');

async function getFollowups(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const followups = await listFollowups({
      patient_id: req.query.patient_id,
      status: req.query.status,
    });

    return res.status(200).json({ followups });
  } catch (error) {
    return next(error);
  }
}

async function createFollowupRecord(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const patient = await findPatientById(req.body.patient_id);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found.',
      });
    }

    const followup = await createFollowup(req.body, req.user?.id);
    return res.status(201).json({ followup });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createFollowupRecord,
  getFollowups,
};
