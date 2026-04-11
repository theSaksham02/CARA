'use strict';

const { validationResult } = require('express-validator');

const { createReadmissionRecord, findPatientById, listReadmissionRecords } = require('../db/setup');
const { predictRisk } = require('../services/readmissionModel');

async function predictReadmission(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { patient_id: patientId, condition, history, age_years: ageYears } = req.body;

    // Validate patient exists
    const patient = await findPatientById(patientId);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found.',
      });
    }

    // Run prediction
    const prediction = predictRisk({
      condition,
      history,
      age_years: ageYears || Math.floor((patient.age_months || 360) / 12),
    });

    // Compute follow-up date
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + prediction.follow_up_days);

    // Save to database
    const record = await createReadmissionRecord(
      {
        patient_id: patientId,
        condition: prediction.condition,
        risk_score: prediction.risk_score,
        risk_level: prediction.risk_level,
        follow_up_date: followUpDate.toISOString().slice(0, 10),
        reason: prediction.reason,
        features: prediction.features,
        model_version: prediction.model_version,
      },
      req.user?.id
    );

    return res.status(200).json({
      risk_score: prediction.risk_score,
      risk_level: prediction.risk_level,
      follow_up_days: prediction.follow_up_days,
      follow_up_date: followUpDate.toISOString().slice(0, 10),
      reason: prediction.reason,
      condition: prediction.condition,
      record_id: record.id,
    });
  } catch (error) {
    return next(error);
  }
}

async function getReadmissionRecords(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const records = await listReadmissionRecords({
      condition: req.query.condition,
      risk_level: req.query.risk_level,
      patient_id: req.query.patient_id,
      limit: req.query.limit,
    });

    return res.status(200).json({ records });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReadmissionRecords,
  predictReadmission,
};
