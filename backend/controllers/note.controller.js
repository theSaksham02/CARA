const { formatSOAP } = require('../../ml/soap/soap_formatter');

const generateNote = (req, res) => {
  const { patient_id, transcript } = req.body;
  
  if (!transcript) {
    return res.status(400).json({ error: "Transcript is required" });
  }

  try {
    // Pass transcript to NLP ML component
    const soapResult = formatSOAP(transcript);

    // Save to DB if patient_id is provided
    if (patient_id) {
      const db = req.app.locals.db;
      db.prepare(`
        INSERT INTO soap_notes (patient_id, subjective, objective, assessment, plan, flags)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        patient_id,
        soapResult.S,
        soapResult.O,
        soapResult.A,
        soapResult.P,
        JSON.stringify(soapResult.flags)
      );
    }

    res.json(soapResult);
  } catch (error) {
    console.error("Note generation error:", error);
    res.status(500).json({ error: "Failed to generate SOAP note" });
  }
};

const getNotes = (req, res) => {
  const db = req.app.locals.db;
  try {
    const notes = db.prepare('SELECT * FROM soap_notes ORDER BY created_at DESC').all();
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
};

module.exports = { generateNote, getNotes };
'use strict';

const { validationResult } = require('express-validator');

const { createSoapNote, findPatientById, findSoapNoteById, listSoapNotes } = require('../db/setup');
const { formatSoapNote } = require('../note-formatter');

async function generateSoapNote(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const { patient_id: patientId, transcript } = req.body;

    if (patientId) {
      const patient = await findPatientById(patientId);
      if (!patient) {
        return res.status(404).json({
          error: 'Patient not found.',
        });
      }
    }

    const noteSections = formatSoapNote(transcript);
    const note = await createSoapNote(
      {
        patient_id: patientId,
        transcript,
        ...noteSections,
      },
      req.user?.id
    );

    return res.status(200).json({
      note,
    });
  } catch (error) {
    return next(error);
  }
}

async function getSoapNotes(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const notes = await listSoapNotes({
      patient_id: req.query.patient_id,
      search: req.query.search,
      limit: req.query.limit,
    });

    return res.status(200).json({
      notes,
    });
  } catch (error) {
    return next(error);
  }
}

async function getSoapNoteById(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const note = await findSoapNoteById(req.params.note_id);
    if (!note) {
      return res.status(404).json({
        error: 'SOAP note not found.',
      });
    }

    return res.status(200).json({ note });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  generateSoapNote,
  getSoapNoteById,
  getSoapNotes,
};
