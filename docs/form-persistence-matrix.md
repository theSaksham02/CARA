# CARA Form Persistence Matrix

## Scope freeze

Included in persistence scope (explicit submit/action only):

- `frontend/join-us.html` join-us contact form.
- `frontend/ward/index.html`:
  - triage submit (`#triage-form`)
  - follow-up submit (`[data-followup-form]`)
  - SOAP send action (`[data-soap-send]`)
  - assistant submit (`#assistant-form`)
- `frontend/the-ward-patient-queue.html` queue-side actions via `frontend/js/ward-crud.js`:
  - create/edit/delete patient
  - run triage
  - schedule follow-up
- `frontend/the-ward-soap-notes.html` SOAP read flow + generated notes persistence.
- `frontend/the-ward-ai-assistant.html` assistant chat submit to backend assistant API.
- `frontend/the-ward-patient-profile.html` profile readback from persisted data.

Excluded by decision:

- Auth/login credentials persistence in CARA DB (Supabase auth remains source of truth).
- Autosave/continuous persistence.
- Search/filter-only UI state.

## Contract map

| Surface | Submit payload | Backend endpoint | Persistence |
| --- | --- | --- | --- |
| Join us | `name,email,role,message` | `POST /public/join-us` | `contact_submissions` |
| Triage | `patient_id?,symptoms[],age_months` | `POST /api/triage/assess` | `triage_assessments` |
| SOAP save | `patient_id?,transcript` | `POST /api/notes/generate` | `soap_notes` |
| Follow-up | `patient_id,due_date,instructions,urgency?` | `POST /api/followup` | `followups` |
| Assistant ask | `question,patient_id?,top_k?` | `POST /api/assistant` | `assistant_interactions` + RAG response |
| Patient CRUD | standard patient fields | `/api/patients` (create/update/delete) | `patients` |

## Cross-page readback

- Queue/overview/assistant cards read from API via `ward-crud.js`.
- SOAP and patient profile pages read persisted patient-linked records.
- Active patient context is shared through `sessionStorage` key `cara-active-patient-id` and optional `patient_id` query parameter.
