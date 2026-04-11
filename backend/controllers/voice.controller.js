'use strict';

const { validationResult } = require('express-validator');

const { createSoapNote, findPatientById } = require('../db/setup');
const { formatSoapNote } = require('../note-formatter');
const { generateSoapNote } = require('../services/llamaService');
const { extractClinicalEntities } = require('../services/llamaService');
const { transcribe } = require('../services/whisperService');

async function transcribeAndGenerateNote(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array(),
    });
  }

  try {
    const {
      audio_base64: audioBase64,
      language = 'en',
      patient_id: patientId,
      format = 'wav',
    } = req.body;

    // Validate patient exists if provided
    if (patientId) {
      const patient = await findPatientById(patientId);
      if (!patient) {
        return res.status(404).json({
          error: 'Patient not found.',
        });
      }
    }

    // Step 1: Transcribe audio via Whisper
    let transcript;
    let transcriptionMethod;

    try {
      const result = await transcribe({ audio_base64: audioBase64, language, format });
      transcript = result.transcript;
      transcriptionMethod = result.method;
    } catch (whisperError) {
      return res.status(503).json({
        error: 'Whisper transcription service is unavailable.',
        details: whisperError.message,
        suggestion: 'Submit a text transcript directly to POST /api/notes/generate instead.',
      });
    }

    if (!transcript || transcript.trim().length === 0) {
      return res.status(422).json({
        error: 'Transcription produced empty result. Audio may be silent or unrecognizable.',
      });
    }

    // Step 2: Generate SOAP note via Llama 3.2 (fallback to rule-based)
    let soapNote;
    let generationMethod;
    let extractedFlags = [];

    const llamaSoap = await generateSoapNote(transcript);

    if (llamaSoap) {
      soapNote = {
        subjective: llamaSoap.S ? [llamaSoap.S] : [],
        objective: llamaSoap.O ? [llamaSoap.O] : [],
        assessment: llamaSoap.A ? [llamaSoap.A] : [],
        plan: llamaSoap.P ? [llamaSoap.P] : [],
      };
      extractedFlags = llamaSoap.flags || [];
      generationMethod = 'llama';
    } else {
      // Rule-based fallback
      const ruleBased = formatSoapNote(transcript);

      // Normalize: rule-based may return strings or arrays
      soapNote = {
        subjective: Array.isArray(ruleBased.subjective) ? ruleBased.subjective : [ruleBased.subjective].filter(Boolean),
        objective: Array.isArray(ruleBased.objective) ? ruleBased.objective : [ruleBased.objective].filter(Boolean),
        assessment: Array.isArray(ruleBased.assessment) ? ruleBased.assessment : [ruleBased.assessment].filter(Boolean),
        plan: Array.isArray(ruleBased.plan) ? ruleBased.plan : [ruleBased.plan].filter(Boolean),
      };
      generationMethod = 'rule-based';

      // Try to extract clinical entities via Llama for flags
      const entities = await extractClinicalEntities(transcript);
      if (entities) {
        extractedFlags = entities.flags || [];
      }
    }

    // Step 3: Save the SOAP note to database
    const savedNote = await createSoapNote(
      {
        patient_id: patientId,
        transcript,
        ...soapNote,
      },
      req.user?.id
    );

    return res.status(200).json({
      transcript,
      soap_note: {
        S: soapNote.subjective.join(' ') || 'No subjective information.',
        O: soapNote.objective.join(' ') || 'No objective information.',
        A: soapNote.assessment.join(' ') || 'No assessment information.',
        P: soapNote.plan.join(' ') || 'No plan information.',
      },
      extracted_flags: extractedFlags,
      note_id: savedNote.id,
      metadata: {
        transcription_method: transcriptionMethod,
        generation_method: generationMethod,
        language,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  transcribeAndGenerateNote,
};
