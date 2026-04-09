const getFollowups = (req, res) => {
  const db = req.app.locals.db;
  try {
    const followups = db.prepare(`
      SELECT f.*, p.name as patient_name 
      FROM followups f 
      LEFT JOIN patients p ON f.patient_id = p.id 
      ORDER BY f.due_date ASC
    `).all();
    res.json(followups);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch follow-ups" });
  }
};

const scheduleFollowup = (req, res) => {
  const db = req.app.locals.db;
  const { patient_id, condition, days_until } = req.body;
  
  if (!patient_id || !days_until) {
    return res.status(400).json({ error: "patient_id and days_until are required" });
  }

  try {
    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + parseInt(days_until));
    const dueDateStr = dueDate.toISOString();

    const info = db.prepare(`
      INSERT INTO followups (patient_id, condition, due_date)
      VALUES (?, ?, ?)
    `).run(patient_id, condition || 'General Follow-up', dueDateStr);

    res.status(201).json({ id: info.lastInsertRowid, patient_id, due_date: dueDateStr, status: 'pending' });
  } catch (error) {
    console.error("Follow-up error:", error);
    res.status(500).json({ error: "Failed to schedule follow-up" });
  }
};

module.exports = { getFollowups, scheduleFollowup };
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
