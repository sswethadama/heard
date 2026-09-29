import { ArrowRight, Brain, Copy, Heart, LockKeyhole, Menu, MessagesSquare, Smartphone, Sparkles, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

type Props = { onSingle: () => void; onTwo: () => void };

const features = [
  { icon: LockKeyhole, title: "Private by design", strip: "Your perspective stays private until both people are ready.", card: "Your thoughts stay between you and the person you're talking to." },
  { icon: Smartphone, title: "Two-device mode", strip: "Each person can use their own device.", card: "Use separate devices for a truly private experience." },
  { icon: Brain, title: "AI-powered analysis", strip: "Understand what's underneath the disagreement.", card: "Turn both sides into meaningful insights." },
  { icon: Heart, title: "Common ground discovery", strip: "Find what both people actually care about.", card: "Find what you both truly care about." },
  { icon: Sparkles, title: "Practical compromises", strip: "Get realistic ways forward.", card: "Get simple, realistic ways forward." },
];

const steps = [
  { icon: LockKeyhole, title: "Share privately", body: "Each person shares their perspective in their own private space." },
  { icon: MessagesSquare, title: "Both perspectives", body: "When both are ready, Heard brings the perspectives together." },
  { icon: Brain, title: "Understand the real friction", body: "AI identifies underlying needs, points of friction, and shared ground." },
  { icon: Heart, title: "Find common ground", body: "Get practical compromise suggestions to move forward." },
];

function Logo() {
  return <span className="font-display text-2xl tracking-tight text-foreground">Heard<span className="text-primary">.</span></span>;
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{children}</p>;
}

function Phone({ label, lines, className = "" }: { label: string; lines?: boolean; className?: string }) {
  return (
    <div className={`w-36 shrink-0 rounded-[2rem] border-[6px] border-foreground bg-card p-3 shadow-[var(--shadow-soft)] sm:w-44 ${className}`}>
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-foreground/80" />
      <p className="font-display text-sm">Heard<span className="text-primary">.</span></p>
      <p className="mt-3 font-display text-base leading-tight">{label}</p>
      <div className="mt-3 space-y-1.5 rounded-xl border border-border bg-surface p-2.5">
        {(lines ? [90, 75, 85, 55] : [80, 60]).map((w, i) => <div key={i} className="h-1.5 rounded-full bg-primary/25" style={{ width: `${w}%` }} />)}
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground"><LockKeyhole className="size-3 text-primary" /> {lines ? "Only you can see this." : "Private"}</p>
    </div>
  );
}

function HeroVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-md items-center justify-center py-6">
      <div className="absolute inset-6 rounded-full bg-blush blur-2xl" aria-hidden />
      <Phone label="Your perspective" className="relative -rotate-6" />
      <div className="relative z-10 -mx-3 grid size-12 shrink-0 place-items-center rounded-full border border-border bg-card shadow-[var(--shadow-heard)]">
        <Heart className="size-5 fill-primary text-primary" />
      </div>
      <Phone label="Their perspective" className="relative rotate-6" />
      <svg className="pointer-events-none absolute inset-x-10 top-4 h-10 w-[calc(100%-5rem)] text-primary/40" viewBox="0 0 200 40" fill="none" aria-hidden>
        <path d="M5 35 C 60 0, 140 0, 195 35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 5" />
      </svg>
    </div>
  );
}

export function HeardHome({ onSingle, onTwo }: Props) {
  const [menu, setMenu] = useState(false);
  const start = () => document.getElementById("start")?.scrollIntoView({ behavior: "smooth" });
  const nav = [["Home", "#top"], ["How it works", "#how"], ["Features", "#features"], ["About", "#about"]];

  return (
    <div id="top" className="overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#top" aria-label="Heard home"><Logo /></a>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            {nav.map(([l, h]) => <a key={l} href={h} className="transition-colors hover:text-foreground">{l}</a>)}
          </nav>
          <Button variant="heard" className="hidden h-11 rounded-full px-5 md:inline-flex" onClick={start}>Start a conversation <ArrowRight /></Button>
          <button className="grid size-11 place-items-center rounded-full md:hidden" onClick={() => setMenu(!menu)} aria-label="Menu">{menu ? <X /> : <Menu />}</button>
        </div>
        {menu && (
          <nav className="border-t border-border bg-background px-5 py-4 md:hidden">
            {nav.map(([l, h]) => <a key={l} href={h} onClick={() => setMenu(false)} className="block py-3 text-base">{l}</a>)}
            <Button variant="heard" className="mt-3 h-12 w-full rounded-full" onClick={() => { setMenu(false); start(); }}>Start a conversation <ArrowRight /></Button>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-12 pt-12 md:grid-cols-2 md:pt-20">
        <div className="text-center md:text-left">
          <Eyebrow>Heard</Eyebrow>
          <h1 className="mt-4 font-display text-[2.6rem] leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            A calmer way through <em className="text-primary">an argument.</em>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-base leading-7 text-muted-foreground md:mx-0 md:text-lg">
            A private space where both people can share their perspective, understand what's really causing the disagreement, and find a way forward together.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Button variant="heard" className="h-13 rounded-full px-7 text-base" onClick={start}>Start a conversation <ArrowRight /></Button>
            <Button variant="outline" className="h-13 rounded-full border-border bg-card px-7 text-base" asChild><a href="#how">How it works</a></Button>
          </div>
        </div>
        <HeroVisual />
      </section>

      {/* Modes */}
      <section id="start" className="mx-auto max-w-6xl scroll-mt-20 px-5">
        <div className="rounded-[2rem] bg-blush px-5 py-10 sm:px-10 sm:py-14">
          <div className="text-center"><Eyebrow>Choose how you'll connect</Eyebrow><h2 className="mt-3 font-display text-3xl sm:text-4xl">Start a conversation</h2></div>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <ModeCard icon={<Smartphone />} title="Pass the device" body={["Together, on one device.", "Take turns answering privately."]} cta="Start" onClick={onSingle} />
            <ModeCard icon={<span className="flex"><Smartphone /><Smartphone className="-ml-2" /></span>} title="Two devices" body={["Each person uses their own phone.", "Connect with a room code."]} cta="Create room" onClick={onTwo} />
          </div>
          <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground"><LockKeyhole className="size-4 text-primary" /> Your perspective stays private until both people are ready.</p>
        </div>
      </section>

      {/* Strip */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-x-5 gap-y-7 px-5 py-12 lg:grid-cols-5">
        {features.map(({ icon: Icon, title, strip }, i) => (
          <div key={title} className={i === 4 ? "col-span-2 lg:col-span-1" : ""}>
            <Icon className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{strip}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-5xl">From two perspectives <em className="text-primary">to a way forward</em></h2>
          <p className="mt-5 leading-7 text-muted-foreground">Heard helps you and the other person share, understand, and move forward — without pressure, without judgment, just real understanding.</p>
        </div>
        <ol className="mt-12 grid gap-4 md:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="relative flex gap-4 rounded-3xl border border-border bg-card p-6 transition-shadow hover:shadow-[var(--shadow-soft)] md:flex-col">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blush text-sm font-semibold text-primary">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <Icon className="hidden size-5 text-primary md:block" />
                <h3 className="font-display text-xl md:mt-4">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </div>
              {i < 3 && <ArrowRight className="absolute -right-3.5 top-1/2 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-background text-primary md:block" />}
            </li>
          ))}
        </ol>
      </section>

      {/* Two-device visual */}
      <section className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid items-center gap-10 rounded-[2rem] bg-blush px-5 py-10 sm:px-10 sm:py-14 md:grid-cols-2">
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              <Phone label="Your perspective" lines />
              <Phone label="Their perspective" lines />
            </div>
            <div className="w-full max-w-xs rounded-3xl border border-border bg-card p-5 text-center shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Room code</p>
              <p className="mt-1 font-display text-4xl tracking-[0.3em] text-primary">4827</p>
              <p className="mt-2 text-xs text-muted-foreground">Share this code with the other person to connect.</p>
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs"><Copy className="size-3" /> Copy code</span>
            </div>
          </div>
          <div>
            <h2 className="font-display text-3xl leading-tight sm:text-4xl">Two ways to have the conversation</h2>
            <p className="mt-4 leading-7 text-muted-foreground">Choose the method that feels right for you. Both options lead to the same understanding.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button onClick={onSingle} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"><Smartphone className="size-5 text-primary" /><p className="mt-3 font-semibold">Pass the device</p><p className="text-sm text-muted-foreground">One phone. Two people.</p></button>
              <button onClick={onTwo} className="rounded-2xl border border-border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)]"><Smartphone className="size-5 text-primary" /><p className="mt-3 font-semibold">Two devices</p><p className="text-sm text-muted-foreground">Each person. Their own phone.</p></button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl sm:text-5xl">More than just a chat</h2>
          <p className="mt-4 leading-7 text-muted-foreground">Thoughtfully designed features that help you understand each other and find common ground.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {features.map(({ icon: Icon, title, card }, i) => (
            <div key={title} className={`rounded-3xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-soft)] ${i === 4 ? "col-span-2 lg:col-span-1" : ""}`}>
              <span className="grid size-10 place-items-center rounded-full bg-blush"><Icon className="size-5 text-primary" /></span>
              <h3 className="mt-4 text-sm font-semibold sm:text-base">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{card}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section id="about" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-12">
        <div className="relative overflow-hidden rounded-[2rem] bg-blush px-6 py-16 text-center">
          <svg className="pointer-events-none absolute -left-6 top-6 h-24 w-40 text-primary/40" viewBox="0 0 160 90" fill="none" aria-hidden><path d="M5 60 C 40 10, 80 90, 155 25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <svg className="pointer-events-none absolute -right-4 bottom-6 h-24 w-40 text-primary/40" viewBox="0 0 160 90" fill="none" aria-hidden><path d="M5 30 C 50 85, 100 5, 155 60" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
          <h2 className="relative font-display text-4xl sm:text-5xl">Ready to be <em className="text-primary">heard?</em></h2>
          <p className="relative mt-4 text-muted-foreground">Better conversations. Stronger connections.</p>
          <Button variant="heard" className="relative mt-8 h-13 w-full max-w-xs rounded-full text-base" onClick={start}>Start a conversation <ArrowRight /></Button>
        </div>
        <footer className="flex flex-col items-center justify-between gap-2 py-8 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p className="flex items-center gap-2"><LockKeyhole className="size-3.5" /> Private by design. Rooms expire after 24 hours.</p>
        </footer>
      </section>
    </div>
  );
}

function ModeCard({ icon, title, body, cta, onClick }: { icon: ReactNode; title: string; body: string[]; cta: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="group flex flex-col rounded-3xl border border-border bg-card p-6 text-left shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-primary/40 sm:p-8">
      <span className="grid size-12 place-items-center rounded-2xl bg-blush text-primary [&_svg]:size-5">{icon}</span>
      <h3 className="mt-5 font-display text-2xl">{title}</h3>
      <p className="mt-2 leading-7 text-muted-foreground">{body[0]}<br />{body[1]}</p>
      <span className="heard-gradient mt-6 inline-flex h-12 items-center justify-center gap-2 self-start rounded-full px-6 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-heard)]">
        {cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}
