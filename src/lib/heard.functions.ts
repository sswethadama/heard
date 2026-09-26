import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const roleSchema = z.enum(["a", "b"]);
const roomCredentialsSchema = z.object({
  roomId: z.string().uuid(),
  token: z.string().uuid(),
  role: roleSchema,
});

export type ConflictAnalysis = {
  crux: string;
  personA: string;
  personB: string;
  compromises: string[];
};

const fallbackAnalysis = (a: string, b: string): ConflictAnalysis => ({
  crux: "You are both trying to feel understood while protecting something important to you.",
  personA: `One person is asking for their experience to be taken seriously: ${a.slice(0, 180)}`,
  personB: `The other person is asking for their experience to be taken seriously: ${b.slice(0, 180)}`,
  compromises: [
    "Take turns reflecting back what you heard before responding.",
    "Agree on one small change each person can try this week.",
    "Set a calm time to revisit how that change felt for both of you.",
  ],
});

async function analyzeTexts(personA: string, personB: string): Promise<ConflictAnalysis> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallbackAnalysis(personA, personB);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [
        {
          role: "system",
          content:
            "You are a neutral conflict mediator. Identify the underlying point of friction without assigning blame. Reframe each person's position generously and specifically. Offer exactly three realistic compromises. Never diagnose, shame, or decide who is right. Return only valid JSON with keys crux, personA, personB, compromises (array of exactly 3 strings).",
        },
        {
          role: "user",
          content: `Person A:\n${personA}\n\nPerson B:\n${personB}`,
        },
      ],
      temperature: 0.35,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) return fallbackAnalysis(personA, personB);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return fallbackAnalysis(personA, personB);

  try {
    const parsed = JSON.parse(content) as ConflictAnalysis;
    if (
      typeof parsed.crux === "string" &&
      typeof parsed.personA === "string" &&
      typeof parsed.personB === "string" &&
      Array.isArray(parsed.compromises) &&
      parsed.compromises.length === 3
    ) {
      return parsed;
    }
  } catch {
    // A calm fallback keeps the session useful if a model response is malformed.
  }
  return fallbackAnalysis(personA, personB);
}

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export const analyzeConflict = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z.object({ personA: z.string().trim().min(10).max(5000), personB: z.string().trim().min(10).max(5000) }).parse(data),
  )
  .handler(async ({ data }) => analyzeTexts(data.personA, data.personB));

const nameSchema = z.string().trim().min(1).max(40);

async function setRoomSignal(heardRoomId: string, patch: { status?: string; name_b?: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("rooms").update({ ...patch, updated_at: new Date().toISOString() }).eq("heard_room_id", heardRoomId);
}

export const createRoom = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ name: nameSchema }).parse(data))
  .handler(async ({ data: input }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = makeCode();
    const { data, error } = await supabaseAdmin
      .from("heard_rooms")
      .insert({ code })
      .select("id, code, person_a_token, expires_at")
      .single();
    if (!error && data) {
      await supabaseAdmin.from("rooms").insert({ heard_room_id: data.id, room_code: data.code, name_a: input.name, status: "waiting" });
      return { roomId: data.id, code: data.code, token: data.person_a_token, expiresAt: data.expires_at };
    }
    if (error?.code !== "23505") throw new Error("We couldn't create a room. Please try again.");
  }
  throw new Error("We couldn't create a unique room code. Please try again.");
});

export const joinRoom = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ code: z.string().trim().toUpperCase().regex(/^[A-Z]{4}$/), name: nameSchema }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin
      .from("heard_rooms")
      .select("id, code, person_b_token, person_b_joined_at, expires_at")
      .eq("code", data.code)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!room) throw new Error("That room code wasn't found or has expired.");
    if (room.person_b_joined_at) throw new Error("That room already has two people.");
    const { data: claimedRoom, error } = await supabaseAdmin
      .from("heard_rooms")
      .update({ person_b_joined_at: new Date().toISOString() })
      .eq("id", room.id)
      .is("person_b_joined_at", null)
      .select("id")
      .maybeSingle();
    if (error || !claimedRoom) throw new Error("That room already has two people.");
    await setRoomSignal(room.id, { name_b: data.name, status: "joined" });
    return { roomId: room.id, code: room.code, token: room.person_b_token, expiresAt: room.expires_at };
  });

export const getRoomStatus = createServerFn({ method: "POST" })
  .inputValidator((data) => roomCredentialsSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenColumn = data.role === "a" ? "person_a_token" : "person_b_token";
    const { data: room } = await supabaseAdmin
      .from("heard_rooms")
      .select("person_b_joined_at, person_a_submitted_at, person_b_submitted_at, analysis, expires_at")
      .eq("id", data.roomId)
      .eq(tokenColumn, data.token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!room) throw new Error("This private room is no longer available.");
    const { data: signal } = await supabaseAdmin.from("rooms").select("name_a, name_b").eq("heard_room_id", data.roomId).maybeSingle();
    return {
      nameA: signal?.name_a ?? "Person A",
      nameB: signal?.name_b ?? "Person B",
      joined: Boolean(room.person_b_joined_at),
      youSubmitted: Boolean(data.role === "a" ? room.person_a_submitted_at : room.person_b_submitted_at),
      bothSubmitted: Boolean(room.person_a_submitted_at && room.person_b_submitted_at),
      analysis: room.analysis as ConflictAnalysis | null,
    };
  });

export const submitRoomPerspective = createServerFn({ method: "POST" })
  .inputValidator((data) => roomCredentialsSchema.extend({ text: z.string().trim().min(10).max(5000) }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenColumn = data.role === "a" ? "person_a_token" : "person_b_token";
    const update = data.role === "a"
      ? { person_a_text: data.text, person_a_submitted_at: new Date().toISOString() }
      : { person_b_text: data.text, person_b_submitted_at: new Date().toISOString() };
    const { data: updated, error } = await supabaseAdmin
      .from("heard_rooms")
      .update(update)
      .eq("id", data.roomId)
      .eq(tokenColumn, data.token)
      .gt("expires_at", new Date().toISOString())
      .select("person_a_text, person_b_text, person_a_submitted_at, person_b_submitted_at, analysis")
      .maybeSingle();
    if (error || !updated) throw new Error("Your words couldn't be saved. Please try again.");

    if (updated.person_a_submitted_at && updated.person_b_submitted_at && updated.person_a_text && updated.person_b_text) {
      const analysis = updated.analysis as ConflictAnalysis | null;
      if (analysis) return { bothSubmitted: true, analysis };
      await setRoomSignal(data.roomId, { status: "analyzing" });
      const freshAnalysis = await analyzeTexts(updated.person_a_text, updated.person_b_text);
      await supabaseAdmin.from("heard_rooms").update({ analysis: freshAnalysis }).eq("id", data.roomId).is("analysis", null);
      await setRoomSignal(data.roomId, { status: "revealed" });
      return { bothSubmitted: true, analysis: freshAnalysis };
    }
    await setRoomSignal(data.roomId, { status: data.role === "a" ? "a_submitted" : "b_submitted" });
    return { bothSubmitted: false, analysis: null };
  });