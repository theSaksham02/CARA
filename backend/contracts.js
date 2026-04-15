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
    assess: {
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
    queue: {
      method: 'GET',
      path: '/api/triage/queue',
      query: ['urgency', 'search', 'limit'],
      response: {
        example: {
          queue: [
            {
              patient_id: 'patient-demo-001',
              patient_name: 'Amara Okoye',
              age_display: '14m',
              urgency: 'RED',
              matched_rule_id: 'danger-sign-red',
              symptoms: ['fever', 'difficulty breathing'],
              triage_time: '2026-04-08T07:20:00.000Z',
            },
          ],
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
    generate: {
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
    list: {
      method: 'GET',
      path: '/api/notes',
      query: ['patient_id', 'search', 'limit'],
      response: {
        example: {
          notes: [
            {
              id: 'note-demo-001',
              patient_id: 'patient-demo-001',
              assessment: ['Possible uncomplicated fever.'],
              plan: ['Monitor temperature and review if symptoms worsen.'],
            },
          ],
        },
      },
    },
    detail: {
      method: 'GET',
      path: '/api/notes/:note_id',
    },
  },
  dashboard: {
    overview: {
      method: 'GET',
      path: '/api/dashboard/overview',
      query: ['queue_limit'],
      response: {
        example: {
          overview: {
            kpis: {
              patients_total: 12,
              patients_triaged_today: 5,
              red_urgent: 2,
              soap_notes_today: 3,
              followups_due: 1,
            },
            high_urgency_cases: [
              {
                patient_name: 'Amara Okoye',
                urgency: 'RED',
                matched_rule_id: 'danger-sign-red',
              },
            ],
          },
        },
      },
    },
  },
  analytics: {
    impact: {
      method: 'GET',
      path: '/api/analytics/impact',
      query: ['range'],
      response: {
        example: {
          analytics: {
            range: 'week',
            metrics: {
              patients_managed: 24,
              red_cases: 5,
              red_resolution_rate: 20.8,
              followup_rate: 58.3,
              documentation_coverage: 66.7,
            },
            daily_volume: [{ date: '2026-04-08', count: 4 }],
            urgency_breakdown: [{ urgency: 'RED', count: 2 }],
            condition_mix: [{ label: 'pneumonia-yellow', count: 3 }],
          },
        },
      },
    },
  },
  patientSummary: {
    byPatientId: {
      method: 'GET',
      path: '/api/patients/:patient_id/summary',
    },
    currentPatient: {
      method: 'GET',
      path: '/api/patients/me/summary',
      query: ['patient_id'],
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
  audit: {
    list: {
      method: 'GET',
      path: '/api/audit',
      query: ['actor_id', 'event_type', 'limit'],
    },
  },
  rag: {
    query: {
      method: 'POST',
      path: '/api/rag/query',
      request: {
        required: ['question'],
        optional: ['patient_id', 'top_k'],
        example: {
          question: 'What urgent actions are needed for fever with chest indrawing?',
          patient_id: 'patient-demo-001',
          top_k: 5,
        },
      },
      response: {
        example: {
          answer:
            'Chest indrawing with fever is a severe pneumonia danger sign and requires immediate referral after pre-referral treatment.',
          citations: [
            {
              chunk_id: 'rag_ab12cd34ef56',
              source_type: 'protocol',
              source_id: 'imci-pneumonia-severe-red-001',
              title: 'Protocol RED rule',
              section: 'imci_rule',
              score: 0.91,
            },
          ],
          confidence: 0.82,
          escalate: false,
          reason: null,
        },
      },
    },
    indexBuild: {
      method: 'POST',
      path: '/api/rag/index/build',
      request: {
        optional: ['patient_id', 'persist'],
      },
    },
    indexRefresh: {
      method: 'POST',
      path: '/api/rag/index/refresh',
      request: {
        optional: ['patient_id', 'persist'],
      },
    },
    indexStatus: {
      method: 'GET',
      path: '/api/rag/index/status',
    },
  },
};

module.exports = {
  apiContracts: deepFreeze(apiContracts),
};
