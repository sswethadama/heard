CREATE TABLE public.heard_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z]{4}$'),
  person_a_token UUID NOT NULL DEFAULT gen_random_uuid(),
  person_b_token UUID NOT NULL DEFAULT gen_random_uuid(),
  person_b_joined_at TIMESTAMPTZ,
  person_a_text TEXT,
  person_b_text TEXT,
  person_a_submitted_at TIMESTAMPTZ,
  person_b_submitted_at TIMESTAMPTZ,
  analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
GRANT ALL ON public.heard_rooms TO service_role;
ALTER TABLE public.heard_rooms ENABLE ROW LEVEL SECURITY;
CREATE INDEX heard_rooms_code_idx ON public.heard_rooms (code);
CREATE INDEX heard_rooms_expires_at_idx ON public.heard_rooms (expires_at);