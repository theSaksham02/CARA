'use strict';

const { validationResult } = require('express-validator');

const { createAssistantInteraction, listAssistantInteractions } = require('../db/setup');
const { queryRagMemory } = require('../services/ragService');

async function askAssistant(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const answer = await queryRagMemory({
      question: req.body.question,
      patient_id: req.body.patient_id,
      top_k: req.body.top_k,
    });

    await createAssistantInteraction(
      {
        patient_id: req.body.patient_id || null,
        question: req.body.question,
        answer: answer.answer,
        citations: answer.citations || [],
        confidence: answer.confidence,
        escalate: answer.escalate,
        reason: answer.reason || null,
        metadata: {
          source: 'api_assistant',
        },
      },
      req.user?.id
    );

    return res.status(200).json(answer);
  } catch (error) {
    return next(error);
  }
}

async function getAssistantLogs(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const interactions = await listAssistantInteractions({
      patient_id: req.query.patient_id,
      limit: req.query.limit,
    });
    return res.status(200).json({ interactions });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  askAssistant,
  getAssistantLogs,
};
