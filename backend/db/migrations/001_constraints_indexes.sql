-- Run this once in Supabase SQL Editor
-- Safe to re-run (IF NOT EXISTS on all statements)

-- Urgency constraint
ALTER TABLE public.triage_assessments
  ADD CONSTRAINT IF NOT EXISTS triage_urgency_check
  CHECK (urgency IN ('RED', 'YELLOW', 'GREEN'));

-- Followup status constraint
ALTER TABLE public.followups
  ADD CONSTRAINT IF NOT EXISTS followups_status_check
  CHECK (status IN ('scheduled', 'completed', 'missed'));

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_triage_created_at
  ON public.triage_assessments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_patient_id
  ON public.triage_assessments (patient_id);
CREATE INDEX IF NOT EXISTS idx_triage_urgency
  ON public.triage_assessments (urgency);
CREATE INDEX IF NOT EXISTS idx_followups_due_date
  ON public.followups (due_date);
CREATE INDEX IF NOT EXISTS idx_followups_status
  ON public.followups (status);
CREATE INDEX IF NOT EXISTS idx_soap_patient_id
  ON public.soap_notes (patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at
  ON public.audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_triage_created_by
  ON public.triage_assessments (created_by);
CREATE INDEX IF NOT EXISTS idx_soap_generated_by
  ON public.soap_notes (generated_by);
