import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Copy, EyeOff, Link2, LoaderCircle, LockKeyhole, MessageCircle, RotateCcw, Smartphone, Sparkles, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { analyzeConflict, analyzeFollowup, createRoom, getRoomStatus, joinRoom, submitRoomFollowup, submitRoomPerspective, type ConflictAnalysis, type FollowupAnalysis } from "@/lib/heard.functions";

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

type Screen = "landing" | "names" | "single-a" | "handoff" | "single-b" | "two-choice" | "room" | "write" | "waiting" | "analyzing" | "reveal" | "followup-a" | "followup-handoff" | "followup-b" | "followup-write" | "followup-waiting" | "followup-reveal";
type RoomSession = { roomId: string; code: string; token: string; role: "a" | "b" };

function HeardApp() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [personA, setPersonA] = useState("");
  const [personB, setPersonB] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [nameA, setNameA] = useState("");
  const [nameB, setNameB] = useState("");
  const [myName, setMyName] = useState("");
  const [room, setRoom] = useState<RoomSession | null>(null);
  const [analysis, setAnalysis] = useState<ConflictAnalysis | null>(null);
  const [error, setError] = useState("");
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [followA, setFollowA] = useState("");
  const [followB, setFollowB] = useState("");
  const [followup, setFollowup] = useState<FollowupAnalysis | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const createRoomFn = useServerFn(createRoom);
  const joinRoomFn = useServerFn(joinRoom);
  const statusFn = useServerFn(getRoomStatus);
  const submitRoomFn = useServerFn(submitRoomPerspective);
  const analyzeFn = useServerFn(analyzeConflict);
  const followupFn = useServerFn(analyzeFollowup);
  const submitFollowFn = useServerFn(submitRoomFollowup);

  const reset = () => {
    setScreen("landing"); setPersonA(""); setPersonB(""); setJoinCode(""); setNameA(""); setNameB(""); setRoom(null); setAnalysis(null); setError(""); setTextA(""); setTextB(""); setFollowA(""); setFollowB(""); setFollowup(null);
  };

  const create = async () => {
    setBusy(true); setError("");
    try {
      const result = await createRoomFn({ data: { name: myName } });
      setNameA(myName.trim());
      setRoom({ ...result, role: "a" });
      setScreen("room");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const join = async () => {
    setBusy(true); setError("");
    try {
      const result = await joinRoomFn({ data: { code: joinCode, name: myName } });
      setNameB(myName.trim());
      setRoom({ ...result, role: "b" });
      setScreen("write");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please check the code."); }
    finally { setBusy(false); }
  };

  const checkStatus = useCallback(async () => {
    if (!room) return;
    try {
      const status = await statusFn({ data: room });
      setNameA(status.nameA); setNameB(status.nameB);
      if (status.textA) setTextA(status.textA);
      if (status.textB) setTextB(status.textB);
      if (status.followup) { setAnalysis(status.analysis); setFollowup(status.followup); if (status.followupTextA) setFollowA(status.followupTextA); if (status.followupTextB) setFollowB(status.followupTextB); setScreen("followup-reveal"); return; }
      if (status.analysis && screen !== "followup-waiting") { setAnalysis(status.analysis); setScreen("reveal"); return; }
      if (screen === "room" && status.joined) setScreen("write");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "This room is unavailable."); }
  }, [room, screen, statusFn]);

  useEffect(() => {
    if (!room || !["room", "waiting", "analyzing", "followup-waiting"].includes(screen)) return;
    void checkStatus();
    // Poll the token-scoped server function; the rooms table is not publicly readable.
    const interval = window.setInterval(() => void checkStatus(), 2500);
    return () => window.clearInterval(interval);
  }, [room, screen, checkStatus]);

  const submitRoom = async () => {
    if (!room) return;
    const text = room.role === "a" ? personA : personB;
    setBusy(true); setError("");
    try {
      const result = await submitRoomFn({ data: { ...room, text } });
      if (result.analysis) { setTextA(result.textA ?? ""); setTextB(result.textB ?? ""); setAnalysis(result.analysis); setScreen("reveal"); }
      else setScreen("waiting");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const submitSingle = async () => {
    setScreen("analyzing"); setError("");
    try { setAnalysis(await analyzeFn({ data: { personA, personB } })); setTextA(personA); setTextB(personB); setScreen("reveal"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); setScreen("single-b"); }
  };

  const submitFollowSingle = async () => {
    if (!analysis) return;
    setScreen("analyzing"); setError("");
    try { setFollowup(await followupFn({ data: { textA, textB, analysis, followA, followB } })); setScreen("followup-reveal"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); setScreen("followup-b"); }
  };

  const submitFollowRoom = async () => {
    if (!room) return;
    setBusy(true); setError("");
    try {
      const result = await submitFollowFn({ data: { ...room, text: room.role === "a" ? followA : followB } });
      if (result.followup) { setFollowup(result.followup); if (result.followupTextA) setFollowA(result.followupTextA); if (result.followupTextB) setFollowB(result.followupTextB); setScreen("followup-reveal"); }
      else setScreen("followup-waiting");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Please try again."); }
    finally { setBusy(false); }
  };

  const continueConversation = () => setScreen(room ? "followup-write" : "followup-a");

  return (
    <main className="min-h-dvh text-foreground">
      <OceanBackdrop />
      <div className="heard-content-veil relative z-10 mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 pb-8 pt-6 sm:px-8 sm:pt-8">
        <header className="flex h-10 items-center justify-between">
          <button type="button" onClick={reset} className="font-display text-2xl text-foreground" aria-label="Return to start">Heard<span className="text-primary">.</span></button>
          {screen !== "landing" && <Button variant="ghost" size="icon" onClick={reset} aria-label="Start over"><RotateCcw /></Button>}
        </header>
        <div className="flex flex-1 flex-col justify-center py-8 animate-soft-in">
          {screen === "landing" && <Landing onSingle={() => setScreen("names")} onTwo={() => setScreen("two-choice")} />}
          {screen === "names" && <Names nameA={nameA} nameB={nameB} setNameA={setNameA} setNameB={setNameB} onBack={() => setScreen("landing")} onContinue={() => setScreen("single-a")} />}
          {screen === "single-a" && <WriteScreen person={nameA || "Person A"} value={personA} onChange={setPersonA} onBack={() => setScreen("names")} onSubmit={() => setScreen("handoff")} busy={false} />}
          {screen === "handoff" && <Handoff nameA={nameA || "Person A"} nameB={nameB || "Person B"} onReady={() => setScreen("single-b")} />}
          {screen === "single-b" && <WriteScreen person={nameB || "Person B"} value={personB} onChange={setPersonB} onBack={() => setScreen("handoff")} onSubmit={submitSingle} busy={false} />}
          {screen === "two-choice" && <TwoChoice name={myName} setName={setMyName} joinCode={joinCode} setJoinCode={setJoinCode} onCreate={create} onJoin={join} busy={busy} />}
          {screen === "room" && room && <RoomCode code={room.code} copied={copied} onCopy={() => { void navigator.clipboard.writeText(room.code); setCopied(true); window.setTimeout(() => setCopied(false), 1600); }} />}
          {screen === "write" && room && <WriteScreen person={myName.trim() || "You"} value={room.role === "a" ? personA : personB} onChange={room.role === "a" ? setPersonA : setPersonB} onBack={reset} onSubmit={submitRoom} busy={busy} />}
          {screen === "waiting" && <Waiting />}
          {screen === "analyzing" && <Analyzing />}
          {screen === "reveal" && analysis && <Reveal nameA={nameA || "Person A"} nameB={nameB || "Person B"} analysis={analysis} textA={textA} textB={textB} onReset={reset} onContinue={continueConversation} />}
          {screen === "followup-a" && <FollowupWrite person={nameA || "Person A"} value={followA} onChange={setFollowA} onBack={() => setScreen("reveal")} onSubmit={() => setScreen("followup-handoff")} busy={false} />}
          {screen === "followup-handoff" && <Handoff nameA={nameA || "Person A"} nameB={nameB || "Person B"} onReady={() => setScreen("followup-b")} />}
          {screen === "followup-b" && <FollowupWrite person={nameB || "Person B"} value={followB} onChange={setFollowB} onBack={() => setScreen("followup-handoff")} onSubmit={submitFollowSingle} busy={false} />}
          {screen === "followup-write" && room && <FollowupWrite person={myName.trim() || "You"} value={room.role === "a" ? followA : followB} onChange={room.role === "a" ? setFollowA : setFollowB} onBack={() => setScreen("reveal")} onSubmit={submitFollowRoom} busy={busy} />}
          {screen === "followup-waiting" && <Waiting />}
          {screen === "followup-reveal" && followup && <FollowupReveal nameA={nameA || "Person A"} nameB={nameB || "Person B"} followA={followA} followB={followB} followup={followup} onReset={reset} />}
          {error && <p role="alert" className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">{error}</p>}
        </div>
        {screen !== "reveal" && screen !== "followup-reveal" && <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground"><LockKeyhole className="size-3.5" /> Private by design. Rooms expire after 24 hours.</p>}
      </div>
    </main>
  );
}

function OceanBackdrop() {
  return (
    <div className="ocean-backdrop" aria-hidden="true">
      <div className="ocean-surface-glow" />
      <svg className="ocean-rays" viewBox="0 0 1000 1000" preserveAspectRatio="none">
        <defs>
          <filter id="ocean-ray-wobble" x="-30%" y="-20%" width="160%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.014" numOctaves="2" seed="12" result="rayNoise">
              <animate attributeName="baseFrequency" dur="14s" values="0.008 0.014;0.012 0.01;0.008 0.014" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="rayNoise" scale="17" xChannelSelector="R" yChannelSelector="B" />
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>
        <g className="ocean-ray-group" filter="url(#ocean-ray-wobble)">
          <path className="ocean-ray ocean-ray-one" d="M430,-30 C360,230 235,500 90,850 L300,900 C400,530 470,250 490,-30 Z" />
          <path className="ocean-ray ocean-ray-two" d="M465,-30 C430,245 390,535 340,900 L505,930 C505,560 505,250 515,-30 Z" />
          <path className="ocean-ray ocean-ray-three" d="M495,-30 C505,270 530,560 565,930 L705,900 C615,520 555,225 535,-30 Z" />
          <path className="ocean-ray ocean-ray-four" d="M515,-30 C575,230 690,510 825,865 L945,790 C755,465 630,210 565,-30 Z" />
          <path className="ocean-ray ocean-ray-five" d="M405,-30 C300,190 155,400 -5,630 L120,720 C310,390 420,170 465,-30 Z" />
        </g>
      </svg>
      <svg className="ocean-caustics" viewBox="0 0 1000 600" preserveAspectRatio="none">
        <defs>
          <filter id="ocean-caustic-filter" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.018 0.052" numOctaves="3" seed="8" result="causticNoise">
              <animate attributeName="baseFrequency" dur="18s" values="0.018 0.052;0.024 0.043;0.018 0.052" repeatCount="indefinite" />
            </feTurbulence>
            <feColorMatrix
              in="causticNoise"
              type="matrix"
              values="0 0 0 0 0.95
                      0 0 0 0 0.68
                      0 0 0 0 0.76
                      0 0 0 8 -5.5"
            />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        <rect width="1000" height="600" filter="url(#ocean-caustic-filter)" />
      </svg>
      <div className="ocean-reading-shade" />
    </div>
  );
}

function Landing({ onSingle, onTwo }: { onSingle: () => void; onTwo: () => void }) {
  return <section>
    <p className="mb-4 text-sm font-medium text-primary">A calmer way through conflict</p>
    <h1 className="max-w-md font-display text-5xl leading-[1.04] sm:text-6xl">Make room to really hear each other.</h1>
    <p className="mt-5 max-w-md text-base leading-7 text-muted-foreground">Each person shares privately. Nothing is revealed until both are ready. Then Heard helps you find the heart of the disagreement—and a way forward.</p>
    <div className="mt-10 grid gap-3">
      <Button variant="heard" size="heard" onClick={onSingle} className="justify-between"><span className="flex items-center gap-3"><Smartphone />One device, passed between us</span><ArrowRight /></Button>
      <Button variant="heard" size="heard" onClick={onTwo} className="justify-between"><span className="flex items-center gap-3"><Users />Two devices, joined by code</span><ArrowRight /></Button>
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
    <Textarea autoFocus value={value} onChange={(event) => onChange(event.target.value)} placeholder="I felt… when… What I need is…" className="mt-7 min-h-64 resize-none border border-primary/30 bg-card p-4 leading-7 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] focus-visible:ring-primary" maxLength={5000} />
    <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Only you can see this right now</span><span>{value.length}/5000</span></div>
    <Button variant="heard" size="heard" className="mt-7 w-full" disabled={!valid || busy} onClick={() => void onSubmit()}>{busy ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}{busy ? "Saving…" : "Seal my response"}</Button>
  </section>;
}

function Names({ nameA, nameB, setNameA, setNameB, onBack, onContinue }: { nameA: string; nameB: string; setNameA: (v: string) => void; setNameB: (v: string) => void; onBack: () => void; onContinue: () => void }) {
  const valid = nameA.trim() && nameB.trim();
  const field = "h-14 border border-primary/30 bg-card text-base";
  return <section>
    <Button variant="ghost" onClick={onBack} className="-ml-3 mb-8 text-muted-foreground"><ArrowLeft />Back</Button>
    <p className="text-sm font-medium text-primary">One device</p><h1 className="mt-3 font-display text-4xl">Who's here?</h1>
    <p className="mt-3 leading-7 text-muted-foreground">First names are enough. They're only used to guide you through.</p>
    <label htmlFor="name-a" className="mt-8 block text-sm text-muted-foreground">First to write</label>
    <Input id="name-a" value={nameA} onChange={(e) => setNameA(e.target.value.slice(0, 40))} placeholder="Name" className={`mt-2 ${field}`} />
    <label htmlFor="name-b" className="mt-5 block text-sm text-muted-foreground">Second to write</label>
    <Input id="name-b" value={nameB} onChange={(e) => setNameB(e.target.value.slice(0, 40))} placeholder="Name" className={`mt-2 ${field}`} />
    <Button variant="heard" size="heard" className="mt-8 w-full" disabled={!valid} onClick={onContinue}>Continue <ArrowRight /></Button>
  </section>;
}

function Handoff({ nameA, nameB, onReady }: { nameA: string; nameB: string; onReady: () => void }) {
  return <section className="text-center">
    <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-surface"><Smartphone className="size-7 text-primary" /></div>
    <h1 className="mt-7 font-display text-4xl">Pass the device to {nameB}</h1>
    <p className="mx-auto mt-4 max-w-sm leading-7 text-muted-foreground">{nameA}'s response is sealed and hidden. When {nameB} has the device, they can continue.</p>
    <Button variant="heard" size="heard" className="mt-9 w-full" onClick={onReady}>I'm {nameB} — I'm ready <ArrowRight /></Button>
  </section>;
}

function TwoChoice({ name, setName, joinCode, setJoinCode, onCreate, onJoin, busy }: { name: string; setName: (v: string) => void; joinCode: string; setJoinCode: (v: string) => void; onCreate: () => void; onJoin: () => void; busy: boolean }) {
  return <section>
    <p className="text-sm font-medium text-primary">Two devices</p><h1 className="mt-3 font-display text-4xl">Meet in a private room.</h1>
    <p className="mt-3 leading-7 text-muted-foreground">One person creates a room. The other joins with its four-letter code.</p>
    <label htmlFor="my-name" className="mt-8 block text-sm text-muted-foreground">Your first name</label>
    <Input id="my-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 40))} placeholder="Name" className="mt-2 h-14 border border-primary/30 bg-card text-base" />
    <Button variant="heard" size="heard" className="mt-6 w-full" onClick={onCreate} disabled={busy || !name.trim()}>{busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}Create a room</Button>
    <div className="my-7 flex items-center gap-4 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or join one<span className="h-px flex-1 bg-border" /></div>
    <label htmlFor="room-code" className="text-sm text-muted-foreground">Room code</label>
    <div className="mt-2 flex gap-2"><Input id="room-code" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 4))} placeholder="HEAR" className="h-14 border border-primary/30 bg-card text-center font-mono text-xl uppercase tracking-[0.35em]" /><Button variant="quiet" size="heard" onClick={onJoin} disabled={joinCode.length !== 4 || busy || !name.trim()}>Join</Button></div>
  </section>;
}

function RoomCode({ code, copied, onCopy }: { code: string; copied: boolean; onCopy: () => void }) {
  return <section className="text-center"><p className="text-sm font-medium text-primary">Your private room</p><h1 className="mt-3 font-display text-4xl">Invite the other person.</h1><p className="mt-4 text-muted-foreground">Ask them to open Heard on their device and enter this code.</p><div className="my-9 rounded-md border border-border card-glow px-6 py-8"><p className="font-mono text-5xl tracking-[0.28em] text-foreground">{code}</p></div><Button variant="quiet" size="heard" onClick={onCopy} className="w-full">{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy room code"}</Button><div className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />Waiting for the other person…</div></section>;
}

function Waiting() { return <section className="text-center"><div className="mx-auto flex size-16 items-center justify-center rounded-full border border-border bg-surface"><EyeOff className="size-7 text-primary" /></div><h1 className="mt-7 font-display text-4xl">Your response is safe.</h1><p className="mx-auto mt-4 max-w-sm leading-7 text-muted-foreground">It stays private while the other person finishes. The reflection appears for both of you at the same time.</p><div className="mt-10 flex items-center justify-center gap-3 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin text-primary" />Waiting for them…</div></section>; }
function Analyzing() { return <section className="text-center"><Sparkles className="mx-auto size-9 animate-pulse text-primary" /><h1 className="mt-7 font-display text-4xl">Finding the thread between you.</h1><p className="mt-4 text-muted-foreground">Reading both perspectives with care…</p></section>; }

function Reveal({ nameA, nameB, analysis, textA, textB, onReset, onContinue }: { nameA: string; nameB: string; analysis: ConflictAnalysis; textA: string; textB: string; onReset: () => void; onContinue: () => void }) {
  return <section className="py-6"><p className="text-sm font-medium text-primary">A shared reflection</p><h1 className="mt-3 font-display text-4xl">What seems to be underneath this.</h1>{(textA || textB) && <div className="mt-7 space-y-3"><Original label={`${nameA} said`} text={textA} /><Original label={`${nameB} said`} text={textB} /></div>}<div className="mt-7 rounded-md heard-gradient p-6 text-primary-foreground"><p className="text-xs font-bold uppercase">The crux</p><p className="mt-3 font-display text-2xl leading-snug">{analysis.crux}</p></div><div className="mt-8 space-y-7"><Reframe label={`${nameA}, fairly heard`} text={analysis.reframeA} /><Reframe label={`${nameB}, fairly heard`} text={analysis.reframeB} /></div><div className="mt-9 border-t border-border pt-8"><h2 className="font-display text-3xl">Three ways forward</h2><ol className="mt-5 space-y-4">{analysis.compromises.map((item, index) => <li key={item} className="flex gap-4 rounded-md border border-border bg-surface p-4"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-soft-rose font-semibold text-primary-foreground">{index + 1}</span><span className="leading-6 text-foreground">{item}</span></li>)}</ol></div><p className="mt-8 text-sm leading-6 text-muted-foreground">This is a reflection, not a verdict. Keep what feels true and leave what doesn't.</p><div className="mt-7 grid gap-3"><Button variant="heard" size="heard" className="w-full" onClick={onContinue}><MessageCircle />Continue the conversation</Button><Button variant="quiet" size="heard" className="w-full" onClick={onReset}><RotateCcw />Start over</Button></div></section>;
}

function Original({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return <div className="rounded-md border border-border bg-card p-4"><p className="text-xs font-bold uppercase text-muted-foreground">{label}</p><p className="mt-2 whitespace-pre-wrap leading-7 text-foreground">{text}</p></div>;
}

function FollowupWrite({ person, value, onChange, onBack, onSubmit, busy }: { person: string; value: string; onChange: (v: string) => void; onBack: () => void; onSubmit: () => void | Promise<void>; busy: boolean }) {
  const valid = value.trim().length >= 2;
  return <section>
    <Button variant="ghost" onClick={onBack} className="-ml-3 mb-8 text-muted-foreground"><ArrowLeft />Back</Button>
    <p className="text-sm font-medium text-primary">{person}'s private space</p>
    <h1 className="mt-3 font-display text-4xl leading-tight">Does this work for you? Anything to add?</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Kept private until you've both answered.</p>
    <Textarea autoFocus value={value} onChange={(e) => onChange(e.target.value)} placeholder="Yes, and… / Not quite, because…" className="mt-7 min-h-40 resize-none border border-primary/30 bg-card p-4 leading-7 shadow-[inset_0_1px_0_oklch(1_0_0/0.04)] focus-visible:ring-primary" maxLength={2000} />
    <div className="mt-2 flex justify-end text-xs text-muted-foreground">{value.length}/2000</div>
    <Button variant="heard" size="heard" className="mt-7 w-full" disabled={!valid || busy} onClick={() => void onSubmit()}>{busy ? <LoaderCircle className="animate-spin" /> : <LockKeyhole />}{busy ? "Saving…" : "Seal my response"}</Button>
  </section>;
}

const outcomeLabel = { agreement: "You've found agreement", partial: "You're partly there", unresolved: "Still some distance" } as const;

function FollowupReveal({ nameA, nameB, followA, followB, followup, onReset }: { nameA: string; nameB: string; followA: string; followB: string; followup: FollowupAnalysis; onReset: () => void }) {
  return <section className="py-6"><p className="text-sm font-medium text-primary">Follow-up</p><h1 className="mt-3 font-display text-4xl">What was said this round.</h1>{(followA || followB) && <div className="mt-7 space-y-3"><Original label={`${nameA} said`} text={followA} /><Original label={`${nameB} said`} text={followB} /></div>}<h2 className="mt-9 font-display text-3xl">{outcomeLabel[followup.outcome]}</h2><p className="mt-5 leading-7 text-foreground">{followup.summary}</p>{followup.unresolved && <div className="mt-7"><Reframe label="Still unresolved" text={followup.unresolved} /></div>}<div className="mt-7 rounded-md heard-gradient p-6 text-primary-foreground"><p className="text-xs font-bold uppercase">A refined way forward</p><p className="mt-3 font-display text-2xl leading-snug">{followup.refinedCompromise}</p></div><Button variant="quiet" size="heard" className="mt-9 w-full" onClick={onReset}><RotateCcw />Start over</Button></section>;
}

function Reframe({ label, text }: { label: string; text: string }) { return <div><p className="text-xs font-bold uppercase text-soft-rose">{label}</p><p className="mt-2 leading-7 text-foreground">{text}</p></div>; }