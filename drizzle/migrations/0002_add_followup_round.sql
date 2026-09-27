ALTER TABLE public.heard_rooms
  ADD COLUMN person_a_followup text,
  ADD COLUMN person_b_followup text,
  ADD COLUMN person_a_followup_at timestamptz,
  ADD COLUMN person_b_followup_at timestamptz,
  ADD COLUMN followup_analysis jsonb;