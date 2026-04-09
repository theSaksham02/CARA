const { evaluateTriage } = require('../engine/engine');

const assessTriage = (req, res) => {
  try {
    const { symptoms, age_group, patient_id, chw_id } = req.body;
    
    // Run the engine
    const result = evaluateTriage(symptoms, age_group);
    
    // Audit log if patient_id is provided
    if (patient_id) {
      const db = req.app.locals.db;
      db.prepare(`
        INSERT INTO triage_audits (patient_id, symptoms, urgency_level, protocol_used, reasons, chw_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        patient_id, 
        JSON.stringify(symptoms), 
        result.level, 
        result.protocol, 
        JSON.stringify(result.reasons),
        chw_id || 'anonymous'
      );
    }

    res.json(result);
  } catch (error) {
    console.error("Triage error:", error);
    res.status(500).json({ error: "Failed to evaluate triage." });
  }
};

module.exports = { assessTriage };
'use strict';

const { validationResult } = require('express-validator');

const { createTriageAssessment, findPatientById, listTriageQueue } = require('../db/setup');
const { evaluateTriage } = require('../engine/engine');

async function assessTriage(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { patient_id: patientId, symptoms, age_months: ageMonths, transcript, metadata } = req.body;

    if (patientId) {
      const patient = await findPatientById(patientId);
      if (!patient) {
        return res.status(404).json({
          error: 'Patient not found.',
        });
      }
    }

    const assessment = evaluateTriage({
      symptoms,
      age_months: ageMonths,
    });

    const savedAssessment = await createTriageAssessment(
      {
        patient_id: patientId,
        symptoms: assessment.symptoms,
        age_months: assessment.age_months,
        urgency: assessment.urgency,
        reason: assessment.reason,
        recommended_action: assessment.recommended_action,
        matched_rule_id: assessment.matched_rule_id,
        transcript,
        metadata,
      },
      req.user?.id
    );

    return res.status(200).json({
      assessment: savedAssessment,
    });
  } catch (error) {
    return next(error);
  }
}

async function getTriageQueue(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const queue = await listTriageQueue({
      urgency: req.query.urgency,
      search: req.query.search,
      limit: req.query.limit,
    });

    return res.status(200).json({
      queue,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  assessTriage,
  getTriageQueue,
};
