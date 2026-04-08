'use strict';

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);

  for (const key of Object.keys(value)) {
    deepFreeze(value[key]);
  }

  return value;
}

const apiContracts = {
  triage: {
    method: 'POST',
    path: '/api/triage/assess',
    request: {
      required: ['symptoms', 'age_months'],
      optional: ['patient_id', 'transcript', 'metadata'],
      example: {
        symptoms: ['fever', 'cough'],
        age_months: 14,
        patient_id: 'patient-demo-001',
        transcript: 'Child has fever and cough for two days.',
        metadata: {
          source: 'field-view',
        },
      },
    },
    response: {
      example: {
        assessment: {
          urgency: 'YELLOW',
          reason: 'Fever with breathing symptoms matches the pneumonia rule.',
          recommended_action: 'Arrange same-day clinician review.',
          matched_rule_id: 'pneumonia-yellow',
          symptoms: ['fever', 'cough'],
          age_months: 14,
        },
      },
    },
  },
  patients: {
    list: {
      method: 'GET',
      path: '/api/patients',
      response: {
        example: {
          patients: [
            {
              id: 'patient-demo-001',
              full_name: 'Amara Okoye',
              age_months: 14,
              caregiver_name: 'Ngozi Okoye',
              village: 'Ikeja',
              sex: 'female',
            },
          ],
        },
      },
    },
    create: {
      method: 'POST',
      path: '/api/patients',
      request: {
        required: ['full_name', 'age_months'],
        optional: ['caregiver_name', 'sex', 'village'],
        example: {
          full_name: 'Amara Okoye',
          age_months: 14,
          caregiver_name: 'Ngozi Okoye',
          sex: 'female',
          village: 'Ikeja',
        },
      },
      response: {
        example: {
          patient: {
            id: 'patient-demo-001',
            full_name: 'Amara Okoye',
            age_months: 14,
          },
        },
      },
    },
  },
  notes: {
    method: 'POST',
    path: '/api/notes/generate',
    request: {
      required: ['transcript'],
      optional: ['patient_id'],
      example: {
        patient_id: 'patient-demo-001',
        transcript: 'Mother reports fever since yesterday. Temperature measured at home.',
      },
    },
    response: {
      example: {
        note: {
          subjective: ['Mother reports fever since yesterday.'],
          objective: ['Temperature measured at home.'],
          assessment: ['Possible uncomplicated fever.'],
          plan: ['Monitor temperature and review if symptoms worsen.'],
        },
      },
    },
  },
  followups: {
    list: {
      method: 'GET',
      path: '/api/followup',
      query: ['patient_id', 'status'],
      response: {
        example: {
          followups: [
            {
              id: 'followup-demo-001',
              patient_id: 'patient-demo-001',
              due_date: '2026-04-09',
              status: 'scheduled',
              instructions: 'Check fever response after 24 hours.',
              urgency: 'YELLOW',
            },
          ],
        },
      },
    },
    create: {
      method: 'POST',
      path: '/api/followup',
      request: {
        required: ['patient_id', 'due_date', 'instructions'],
        optional: ['urgency', 'status'],
        example: {
          patient_id: 'patient-demo-001',
          due_date: '2026-04-09',
          instructions: 'Check fever response after 24 hours.',
          urgency: 'YELLOW',
          status: 'scheduled',
        },
      },
      response: {
        example: {
          followup: {
            id: 'followup-demo-001',
            patient_id: 'patient-demo-001',
            due_date: '2026-04-09',
            status: 'scheduled',
          },
        },
      },
    },
  },
};

module.exports = {
  apiContracts: deepFreeze(apiContracts),
};
