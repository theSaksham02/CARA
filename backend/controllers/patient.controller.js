'use strict';

const { validationResult } = require('express-validator');

const { createPatient, listPatients } = require('../db/setup');

async function getPatients(_req, res, next) {
  try {
    const patients = await listPatients();
    return res.status(200).json({ patients });
  } catch (error) {
    return next(error);
  }
}

async function createPatientRecord(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const patient = await createPatient(req.body, req.user?.id);
    return res.status(201).json({ patient });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPatientRecord,
  getPatients,
};
