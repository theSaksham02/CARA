'use strict';

const { validationResult } = require('express-validator');

const { createPatient, deletePatient, getPatientSummary, listPatients, updatePatient } = require('../db/setup');

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

async function getPatientVisitSummary(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const summary = await getPatientSummary(req.params.patient_id);
    if (!summary) {
      return res.status(404).json({
        error: 'Patient not found.',
      });
    }

    return res.status(200).json({ summary });
  } catch (error) {
    return next(error);
  }
}

async function getCurrentPatientVisitSummary(req, res, next) {
  const patientId = req.query.patient_id || req.user?.patient_id;

  if (!patientId) {
    return res.status(400).json({
      error: 'A patient context is required. Provide patient_id or authenticate as a patient user.',
    });
  }

  req.params.patient_id = patientId;
  return getPatientVisitSummary(req, res, next);
}

async function updatePatientRecord(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const patient = await updatePatient(req.params.patient_id, req.body);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    return res.status(200).json({ patient });
  } catch (error) {
    return next(error);
  }
}

async function deletePatientRecord(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const deleted = await deletePatient(req.params.patient_id);
    if (!deleted) {
      return res.status(404).json({ error: 'Patient not found.' });
    }
    return res.status(200).json({ deleted: true });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createPatientRecord,
  getCurrentPatientVisitSummary,
  deletePatientRecord,
  getPatients,
  getPatientVisitSummary,
  updatePatientRecord,
};
