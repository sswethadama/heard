import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Copy, EyeOff, Link2, LoaderCircle, LockKeyhole, RotateCcw, Smartphone, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeConflict, createRoom, getRoomStatus, joinRoom, submitRoomPerspective, type ConflictAnalysis } from "@/lib/heard.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Heard — Find the way forward, together" },
      { name: "description", content: "A private, two-person space to understand conflict and find fair next steps." },
      { property: "og:title", content: "Heard — Conflict resolution for two" },
      { property: "og:description", content: "Share privately, understand each other, and find a way forward together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HeardApp,
});

type Screen = "landing" | "single-a" | "handoff" | "single-b" | "two-choice" | "room" | "write" | "waiting" | "analyzing" | "reveal";
type RoomSession = { roomId: string; code: string; token: string; role: "a" | "b" };

function HeardApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<RoomSession | null>(null);
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);
  const statusFn = useServerFn(getRoomStatus);
  const submitRoomFn = useServerFn(submitRoomPerspective);
  const analyzeFn = useServerFn(analyzeConflict);

  const reset = () => {
    setScreen("landing"); setPersonA(""); setPersonB(""); setJoinCode(""); setRoom(null); setAnalysis(null); setError("");
  };

  const create = async () => {
    setBusy(true); setError("");
    try {
      const result = await createRoomFn();
      setRoom({ ...result, role: "a" });
      setScreen("room");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const join = async () => {
    setBusy(true); setError("");
    try {
      const result = await joinRoomFn({ data: { code: joinCode } });
      setRoom({ ...result, role: "b" });
      setScreen("write");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please check the code."); }
    finally { setBusy(false); }
  };

  const checkStatus = useCallback(async () => {
    if (!room) return;
    try {
      const status = await statusFn({ data: room });
      if (status.analysis) { setAnalysis(status.analysis); setScreen("reveal"); return; }
      if (screen === "room" && status.joined) setScreen("write");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This room is unavailable."); }
  }, [room, screen, statusFn]);

  useEffect(() => {
    if (!room || !["room", "waiting", "analyzing"].includes(screen)) return;
    void checkStatus();
    const interval = window.setInterval(() => void checkStatus(), 2200);
    return () => window.clearInterval(interval);
  }, [room, screen, checkStatus]);

  const submitRoom = async () => {
    if (!room) return;
    const text = room.role === "a" ? personA : personB;
    setBusy(true); setError("");
    try {
      const result = await submitRoomFn({ data: { ...room, text } });
      if (result.analysis) { setAnalysis(result.analysis); setScreen("reveal"); }
      else setScreen("waiting");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const submitSingle = async () => {
    setScreen("analyzing"); setError("");
    try { setAnalysis(await analyzeFn({ data: { personA, personB } })); setScreen("reveal"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); setScreen("single-b"); }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
        <header className="flex h-10 items-center justify-between">
          <button type="button" onClick={reset} className="font-display text-2xl text-foreground" aria-label="Return to start">Heard<span className="text-primary">.</span></button>
          {screen !== "landing" && <Button variant="ghost" size="icon" onClick={reset} aria-label="Start over"><RotateCcw /></Button>}
        </header>
        <div className="flex flex-1 flex-col justify-center py-8 animate-soft-in">
          {screen === "landing" && <Landing onSingle={() => setScreen("single-a")} onTwo={() => setScreen("two-choice")} />}
          {screen === "single-a" && <WriteScreen person="Person A" value={personA} onChange={setPersonA} onBack={() => setScreen("landing")} onSubmit={() => setScreen("handoff")} busy={false} />}
          {screen === "handoff" && <Handoff onReady={() => setScreen("single-b")} />}
          {screen === "single-b" && <WriteScreen person="Person B" value={personB} onChange={setPersonB} onBack={() => setScreen("handoff")} onSubmit={submitSingle} busy={false} />}
          {screen === "two-choice" && <TwoChoice joinCode={joinCode} setJoinCode={setJoinCode} onCreate={create} onJoin={join} busy={busy} />}
          {screen === "room" && room && <RoomCode code={room.code} copied={copied} onCopy={() => { void navigator.clipboard.writeText(room.code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }} />}
          {screen === "write" && room && <WriteScreen person="You" value={room.role === "a" ? personA : personB} onChange={room.role === "a" ? setPersonA : setPersonB} onBack={reset} onSubmit={submitRoom} busy={busy} />}
          {screen === "waiting" && <Waiting />}
          {screen === "analyzing" && <Analyzing />}
          {screen === "reveal" && analysis && <Reveal analysis={analysis} onReset={reset} />}
          {error && <p role="alert" className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">{error}</p>}
        </div>
        {screen !== "reveal" && <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Private by design. Rooms expire after 24 hours.</p>}
      </div>
    </main>
  );
}

function Landing({ onSingle, onTwo }: { onSingle: () => void; onTwo: () => void }) {
  return <section>
    <p className="mb-4 text-sm font-medium text-primary">A calmer way through conflict</p>
    <h1 className="max-w-md font-display text-5xl leading-[1.04] sm:text-6xl">Make room to really hear each other.</h1>
    <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Each person shares privately. Nothing is revealed until both are ready. Then Heard helps you find the heart of the disagreement—and a way forward.</p>
    <div className="mt-10 grid gap-3">
      <Button variant="heard" size="heard" onClick={onSingle} className="justify-between"><span className="flex items-center gap-3"><Smartphone />One device, passed between us</span><ArrowRight /></Button>
      <Button variant="quiet" size="heard" onClick={onTwo} className="justify-between"><span className="flex items-center gap-3"><Users />Two devices, joined by code</span><ArrowRight /></Button>
    </div>
  </section>;
}

function WriteScreen({ person, value, onChange, onBack, onSubmit, busy }: { person: string; value: string; onChange: (v: string) => void; onBack: () => void; onSubmit: () => void | Promise<void>; busy: boolean }) {
  const valid = value.trim().length >= 10;
  return <section>
    <Button variant="ghost" onClick={onBack} className="-ml-3 mb-8 text-muted-foreground"><ArrowLeft />Back</Button>
    <p className="text-sm font-medium text-primary">{person}'s private space</p>
    <h1 className="mt-3 font-display text-4xl leading-tight">What do you wish they understood?</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Write honestly. Focus on what happened, how it affected you, and what you need now.</p>
    <Textarea autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="I felt… when… What I need is…" className="mt-7 min-h-64 resize-none border-border bg-surface p-4 leading-7 shadow-none focus-visible:ring-primary" maxLength={5000} />
    <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Only you can see this right now</span><span>{value.length}/5000</span></div>
    <Button variant="heard" size="heard" className="mt-7 w-full" disabled={!valid || busy} onClick={() => void onSubmit()}>{busy ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}{busy ? "Saving…" : "Seal my response"}</Button>
  </section>;
}

function Handoff({ onReady }: { onReady: () => void }) {
  return <section className="text-center">
    <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-surface"><Smartphone className="size-7 text-primary" /></div>
    <h1 className="mt-7 font-display text-4xl">Pass the device to Person B</h1>
    <p className="mx-auto mt-4 max-w-sm leading-7 text-muted-foreground">Person A's response is sealed and hidden. When Person B has the device, they can continue.</p>
    <Button variant="heard" size="heard" className="mt-9 w-full" onClick={onReady}>I'm Person B — I'm ready <ArrowRight /></Button>
  </section>;
}

function TwoChoice({ joinCode, setJoinCode, onCreate, onJoin, busy }: { joinCode: string; setJoinCode: (v: string) => void; onCreate: () => void; onJoin: () => void; busy: boolean }) {
  return <section>
    <p className="text-sm font-medium text-primary">Two devices</p><h1 className="mt-3 font-display text-4xl">Meet in a private room.</h1>
    <p className="mt-3 leading-7 text-muted-foreground">One person creates a room. The other joins with its four-letter code.</p>
    <Button variant="heard" size="heard" className="mt-8 w-full" onClick={onCreate} disabled={busy}>{busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}Create a room</Button>
    <div className="my-7 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or join one<span className="h-px flex-1 bg-border" /></div>
    <label htmlFor="room-code" className="text-sm text-muted-foreground">Room code</label>
    <div className="mt-2 flex gap-2"><Input id="room-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="HEAR" className="h-14 bg-surface text-center font-mono text-xl uppercase tracking-[0.35em]" /><Button variant="quiet" size="heard" onClick={onJoin} disabled={joinCode.length !== 4 || busy}>Join</Button></div>
  </section>;
}

function RoomCode({ code, copied, onCopy }: { code: string; copied: boolean; onCopy: () => void }) {
  return <section className="text-center"><p className="text-sm font-medium text-primary">Your private room</p><h1 className="mt-3 font-display text-4xl">Invite the other person.</h1><p className="mt-4 text-muted-foreground">Ask them to open Heard on their device and enter this code.</p><div className="my-9 rounded-md border border-border bg-surface px-6 py-8"><p className="font-mono text-5xl tracking-[0.28em] text-foreground">{code}</p></div><Button variant="quiet" size="heard" onClick={onCopy} className="w-full">{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy room code"}</Button><div className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />Waiting for the other person…</div></section>;
}

function Waiting() { return <section className="text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-surface"><EyeOff className="size-7 text-primary" /></div><h1 className="mt-7 font-display text-4xl">Your response is safe.</h1><p className="mx-auto mt-4 max-w-sm leading-7 text-muted-foreground">It stays private while the other person finishes. The reflection appears for both of you at the same time.</p><div className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />Waiting for them…</div></section>; }
function Analyzing() { return <section className="text-center"><Sparkles className="mx-auto size-9 animate-pulse text-primary" /><h1 className="mt-7 font-display text-4xl">Finding the thread between you.</h1><p className="mt-4 text-muted-foreground">Reading both perspectives with care…</p></section>; }

function Reveal({ analysis, onReset }: { analysis: ConflictAnalysis; onReset: () => void }) {
  return <section className="py-6"><p className="text-sm font-medium text-primary">A shared reflection</p><h1 className="mt-3 font-display text-4xl">What seems to be underneath this.</h1><div className="mt-7 rounded-md bg-primary p-6 text-primary-foreground"><p className="text-xs font-bold uppercase">The crux</p><p className="mt-3 font-display text-2xl leading-snug">{analysis.crux}</p></div><div className="mt-8 space-y-7"><Reframe label="Person A, fairly heard" text={analysis.personA} /><Reframe label="Person B, fairly heard" text={analysis.personB} /></div><div className="mt-9 border-t border-border pt-8"><h2 className="font-display text-3xl">Three ways forward</h2><ol className="mt-5 space-y-4">{analysis.compromises.map((item, index) => <li key={item} className="flex gap-4 rounded-md border border-border bg-surface p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-soft-rose font-semibold text-primary-foreground">{index + 1}</span><span className="leading-6 text-foreground">{item}</span></li>)}</ol></div><p className="mt-8 text-sm leading-6 text-muted-foreground">This is a reflection, not a verdict. Keep what feels true and leave what doesn't.</p><Button variant="quiet" size="heard" className="mt-7 w-full" onClick={onReset}><RotateCcw />Start a new conversation</Button></section>;
}

function Reframe({ label, text }: { label: string; text: string }) { return <div><p className="text-xs font-bold uppercase text-soft-rose">{label}</p><p className="mt-2 leading-7 text-foreground">{text}</p></div>; }