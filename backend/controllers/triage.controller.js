'use strict';

const { validationResult } = require('express-validator');

const { createTriageAssessment, findPatientById } = require('../db/setup');
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

module.exports = {
  assessTriage,
};
