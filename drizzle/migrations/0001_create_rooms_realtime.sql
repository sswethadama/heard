CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  heard_room_id uuid NOT NULL UNIQUE REFERENCES public.heard_rooms(id) ON DELETE CASCADE,
  room_code text NOT NULL UNIQUE,
  name_a text,
  name_b text,
  status text NOT NULL DEFAULT 'waiting',
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.rooms IS 'Public live-status signal for two-device rooms. Never holds private text; texts live in heard_rooms behind server functions.';
GRANT SELECT ON public.rooms TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Room status is readable" ON public.rooms FOR SELECT TO anon, authenticated USING (true);
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;