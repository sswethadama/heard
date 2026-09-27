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
  reframeA: string;
  reframeB: string;
  compromises: string[];
};

const fallbackAnalysis = (a: string, b: string): ConflictAnalysis => ({
  crux: "You are both trying to feel understood while protecting something important to you.",
  reframeA: `One person is asking for their experience to be taken seriously: ${a.slice(0, 180)}`,
  reframeB: `The other person is asking for their experience to be taken seriously: ${b.slice(0, 180)}`,
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
            'Analyze two people\'s sides of an unresolved disagreement. Return ONLY JSON: {"crux": "1-2 sentences on the real underlying friction, which may differ from what either person said", "reframeA": "2-3 sentences reframing person A fairly, naming their real underlying need", "reframeB": "same for person B", "compromises": ["3 short, concrete, actionable compromises"]}',
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
      typeof parsed.reframeA === "string" &&
      typeof parsed.reframeB === "string" &&
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
      .select("person_b_joined_at, person_a_submitted_at, person_b_submitted_at, analysis, expires_at, person_a_text, person_b_text, followup_analysis")
      .eq("id", data.roomId)
      .eq(tokenColumn, data.token)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!room) throw new Error("This private room is no longer available.");
    const { data: signal } = await supabaseAdmin.from("rooms").select("name_a, name_b").eq("heard_room_id", data.roomId).maybeSingle();
    const revealed = Boolean(room.analysis);
    return {
      nameA: signal?.name_a ?? "Person A",
      nameB: signal?.name_b ?? "Person B",
      joined: Boolean(room.person_b_joined_at),
      youSubmitted: Boolean(data.role === "a" ? room.person_a_submitted_at : room.person_b_submitted_at),
      bothSubmitted: Boolean(room.person_a_submitted_at && room.person_b_submitted_at),
      analysis: room.analysis as ConflictAnalysis | null,
      // Original texts are only released once the reveal has happened.
      textA: revealed ? room.person_a_text : null,
      textB: revealed ? room.person_b_text : null,
      followup: room.followup_analysis as FollowupAnalysis | null,
    };
  });

export type FollowupAnalysis = {
  outcome: "agreement" | "partial" | "unresolved";
  summary: string;
  unresolved: string;
  refinedCompromise: string;
};

type FollowupInput = { textA: string; textB: string; analysis: ConflictAnalysis; followA: string; followB: string };

const fallbackFollowup = (): FollowupAnalysis => ({
  outcome: "partial",
  summary: "You've both shared where you stand after reading the reflection.",
  unresolved: "Some details may still need a calm, direct conversation.",
  refinedCompromise: "Pick the one suggestion you both feel best about and try it for a week, then check in together.",
});

async function analyzeFollowupTexts(input: FollowupInput): Promise<FollowupAnalysis> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return fallbackFollowup();
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.1-flash-lite",
      messages: [
        {
          role: "system",
          content:
            'You are a calm, neutral mediator doing one short follow-up round. Given two people\'s original messages, the crux, the proposed compromises, and each person\'s response to them, return ONLY JSON: {"outcome": "agreement" | "partial" | "unresolved", "summary": "1-2 sentences on where they now stand", "unresolved": "1 sentence on what is still open, or empty string if nothing", "refinedCompromise": "1-2 sentences: a single refined, concrete next step that fits both responses"}',
        },
        {
          role: "user",
          content: `Person A original:\n${input.textA}\n\nPerson B original:\n${input.textB}\n\nCrux:\n${input.analysis.crux}\n\nCompromises:\n${input.analysis.compromises.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\nPerson A follow-up:\n${input.followA}\n\nPerson B follow-up:\n${input.followB}`,
        },
      ],
      temperature: 0.35,
      response_format: { type: "json_object" },
    }),
  });
  if (!response.ok) return fallbackFollowup();
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  try {
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? "") as FollowupAnalysis;
    if (["agreement", "partial", "unresolved"].includes(parsed.outcome) && typeof parsed.summary === "string" && typeof parsed.refinedCompromise === "string") {
      return { ...parsed, unresolved: typeof parsed.unresolved === "string" ? parsed.unresolved : "" };
    }
  } catch {
    // fall through
  }
  return fallbackFollowup();
}

const analysisSchema = z.object({ crux: z.string().max(2000), reframeA: z.string().max(3000), reframeB: z.string().max(3000), compromises: z.array(z.string().max(1000)).max(5) });
const longText = z.string().trim().min(10).max(5000);
const followText = z.string().trim().min(2).max(2000);

export const analyzeFollowup = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ textA: longText, textB: longText, analysis: analysisSchema, followA: followText, followB: followText }).parse(data))
  .handler(async ({ data }) => analyzeFollowupTexts(data));

export const submitRoomFollowup = createServerFn({ method: "POST" })
  .inputValidator((data) => roomCredentialsSchema.extend({ text: followText }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tokenColumn = data.role === "a" ? "person_a_token" : "person_b_token";
    const now = new Date().toISOString();
    const update = data.role === "a"
      ? { person_a_followup: data.text, person_a_followup_at: now }
      : { person_b_followup: data.text, person_b_followup_at: now };
    const { data: row, error } = await supabaseAdmin
      .from("heard_rooms")
      .update(update)
      .eq("id", data.roomId)
      .eq(tokenColumn, data.token)
      .gt("expires_at", now)
      .not("analysis", "is", null)
      .select("person_a_text, person_b_text, analysis, person_a_followup, person_b_followup, followup_analysis")
      .maybeSingle();
    if (error || !row) throw new Error("Your response couldn't be saved. Please try again.");
    if (row.followup_analysis) return { followup: row.followup_analysis as FollowupAnalysis };
    if (row.person_a_followup && row.person_b_followup && row.person_a_text && row.person_b_text) {
      const followup = await analyzeFollowupTexts({
        textA: row.person_a_text, textB: row.person_b_text, analysis: row.analysis as ConflictAnalysis,
        followA: row.person_a_followup, followB: row.person_b_followup,
      });
      await supabaseAdmin.from("heard_rooms").update({ followup_analysis: followup }).eq("id", data.roomId).is("followup_analysis", null);
      await setRoomSignal(data.roomId, { status: "followup_revealed" });
      return { followup };
    }
    return { followup: null };
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