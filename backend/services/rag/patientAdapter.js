'use strict';

const {
  findPatientById,
  listFollowups,
  listPatients,
  listSoapNotes,
  listTriageAssessments,
} = require('../../db/setup');
const { createChunkRecords, normalizeWhitespace } = require('./chunker');

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
}

function buildPatientHeader(patient) {
  return normalizeWhitespace(`
    Patient: ${patient.full_name || patient.id}
    Patient ID: ${patient.id}
    Age months: ${patient.age_months}
    Caregiver: ${patient.caregiver_name || 'unknown'}
    Village: ${patient.village || 'unknown'}
  `);
}

function triageRecordText(record, patient) {
  return normalizeWhitespace(`
    ${buildPatientHeader(patient)}
    Encounter type: triage assessment
    Assessment ID: ${record.id}
    Timestamp: ${record.created_at}
    Urgency: ${record.urgency}
    Symptoms: ${toArray(record.symptoms).join(', ')}
    Reason: ${record.reason}
    Recommended action: ${record.recommended_action}
    Suggested tests: ${toArray(record.suggested_tests).join(', ') || 'none'}
    Protocol rule: ${record.matched_rule_id || 'unknown'}
  `);
}

function soapRecordText(record, patient) {
  return normalizeWhitespace(`
    ${buildPatientHeader(patient)}
    Encounter type: SOAP note
    Note ID: ${record.id}
    Timestamp: ${record.created_at}
    Transcript summary: ${record.transcript}
    Subjective: ${toArray(record.subjective).join('; ') || 'none'}
    Objective: ${toArray(record.objective).join('; ') || 'none'}
    Assessment: ${toArray(record.assessment).join('; ') || 'none'}
    Plan: ${toArray(record.plan).join('; ') || 'none'}
  `);
}

function followupRecordText(record, patient) {
  return normalizeWhitespace(`
    ${buildPatientHeader(patient)}
    Encounter type: follow-up
    Follow-up ID: ${record.id}
    Created at: ${record.created_at}
    Due date: ${record.due_date}
    Status: ${record.status}
    Urgency: ${record.urgency || 'unknown'}
    Instructions: ${record.instructions}
  `);
}

async function resolvePatients(patientId) {
  if (patientId) {
    const patient = await findPatientById(patientId);
    return patient ? [patient] : [];
  }

  return listPatients();
}

async function buildPatientMemoryChunks({ patientId } = {}) {
  const patients = await resolvePatients(patientId);
  const chunks = [];

  for (const patient of patients) {
    const [triageRows, soapRows, followupRows] = await Promise.all([
      listTriageAssessments({ patient_id: patient.id, limit: 100 }),
      listSoapNotes({ patient_id: patient.id, limit: 100 }),
      listFollowups({ patient_id: patient.id }),
    ]);

    for (const triage of triageRows) {
      chunks.push(
        ...createChunkRecords({
          sourceType: 'patient_history',
          sourceId: triage.id,
          patientId: patient.id,
          title: 'Triage assessment history',
          section: 'triage_assessment',
          text: triageRecordText(triage, patient),
          timestamp: triage.created_at,
        })
      );
    }

    for (const note of soapRows) {
      chunks.push(
        ...createChunkRecords({
          sourceType: 'patient_history',
          sourceId: note.id,
          patientId: patient.id,
          title: 'SOAP note history',
          section: 'soap_note',
          text: soapRecordText(note, patient),
          timestamp: note.created_at,
        })
      );
    }

    for (const followup of followupRows) {
      chunks.push(
        ...createChunkRecords({
          sourceType: 'patient_history',
          sourceId: followup.id,
          patientId: patient.id,
          title: 'Follow-up history',
          section: 'followup',
          text: followupRecordText(followup, patient),
          timestamp: followup.created_at,
        })
      );
    }
  }

  return {
    source: 'patient_history',
    patientCount: patients.length,
    chunks,
  };
}

module.exports = {
  buildPatientMemoryChunks,
};
