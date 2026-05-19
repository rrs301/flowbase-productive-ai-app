"use client"
import { useState } from "react";
import {
  ArrowRight, Bot, CalendarClock, Check, Columns3,
  FileText, LayoutDashboard, PenTool, Sparkles, Users2, Zap,
} from "lucide-react";

const FEATURES = [
  { icon: Bot, title: "AI Assistant", desc: "Turn fuzzy ideas into tasks, plans, and next steps in seconds.", accent: "#f5f0e8", border: "#e8dcc8", ibg: "#ede3d0", ic: "#8b6914" },
  { icon: LayoutDashboard, title: "Smart Dashboard", desc: "Tasks, calendar, notes, and AI activity in one calm command center.", accent: "#edf5f0", border: "#cce0d4", ibg: "#d4ead9", ic: "#2d6e47" },
  { icon: Columns3, title: "Kanban Boards", desc: "Flexible task boards built for personal and team flow.", accent: "#eff4fb", border: "#c8d8ef", ibg: "#d4e4f5", ic: "#1a4f85" },
  { icon: FileText, title: "Notion-style Notes", desc: "Structured editor for specs, research, and deep work.", accent: "#f5f0fb", border: "#ddd0f0", ibg: "#e8daef", ic: "#6b3fa0" },
  { icon: PenTool, title: "Visual Whiteboard", desc: "Map ideas and sketch workflows on an infinite canvas.", accent: "#fdf0f0", border: "#f0d0d0", ibg: "#f5d8d8", ic: "#a03030" },
  { icon: CalendarClock, title: "Calendar & Reminders", desc: "Schedule priorities and keep upcoming work visible.", accent: "#fdf5ec", border: "#f0dcc0", ibg: "#f5e4c4", ic: "#8b5a14" },
];

const STEPS = [
  { num: "01", label: "Organize", detail: "Bring notes, tasks, and calendars into one shared system." },
  { num: "02", label: "Create with AI", detail: "Ask for task lists, summaries, diagrams, and templates." },
  { num: "03", label: "Collaborate", detail: "Share boards, track progress, and keep momentum alive." },
];

const PLANS = [
  {
    name: "Free", price: "$0", per: "/mo", desc: "For getting started", highlight: false,
    items: ["Dashboard, notes & tasks", "Basic calendar planning", "Personal whiteboards", "Limited AI assistant"],
    cta: "Start for free",
  },
  {
    name: "Pro", price: "$16", per: "/mo", desc: "For power users", highlight: true,
    items: ["Unlimited notes & boards", "Advanced AI actions", "AI template builder", "Productivity insights", "Priority history"],
    cta: "Upgrade to Pro",
  },
  {
    name: "Team", price: "$39", per: "/mo", desc: "For collaborative teams", highlight: false,
    items: ["Shared Kanban spaces", "Live presence & comments", "Team categories", "Admin controls", "Priority support"],
    cta: "Start team plan",
  },
];

const serif = "'Playfair Display', Georgia, serif";
const amber = "#c9873a";
const dark = "#1e1408";
const muted = "#6b5c44";
const faint = "#8b7a60";
const bd = "#ede8df";

function NavBar() {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(255,252,247,0.92)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${bd}` }}>
      <nav style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={16} color="#fff" />
          </span>
          <span style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, color: dark, letterSpacing: "-0.01em" }}>Flowbase</span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {["Features", "Pricing"].map((l) => (
            <a key={l} href={`#${l.toLowerCase()}`} style={{ fontSize: 14, fontWeight: 500, color: muted, textDecoration: "none", padding: "6px 14px", borderRadius: 7 }}>{l}</a>
          ))}
          <a href="/dashboard" style={{ marginLeft: 8, background: amber, color: "#fff", fontSize: 14, fontWeight: 600, padding: "7px 18px", borderRadius: 8, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
            Get Started <ArrowRight size={14} />
          </a>
        </div>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section style={{ background: "linear-gradient(160deg,#fffcf7 0%,#fff8ee 45%,#f5f0e8 100%)", borderBottom: `1px solid ${bd}`, padding: "80px 24px 72px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fdf0de", border: "1px solid #f0dcc0", borderRadius: 100, padding: "5px 14px", marginBottom: 24 }}>
            <Zap size={13} color={amber} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#8b5a14", letterSpacing: "0.06em", textTransform: "uppercase" }}>AI-Powered Workspace</span>
          </div>
          <h1 style={{ fontFamily: serif, fontSize: 52, fontWeight: 700, lineHeight: 1.1, color: dark, margin: "0 0 20px", letterSpacing: "-0.02em" }}>
            One workspace.<br /><span style={{ color: amber }}>Every way you think.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: muted, margin: "0 0 36px", maxWidth: 440 }}>
            Flowbase combines notes, whiteboards, kanban boards, calendar planning, and AI assistance in one calm, modern workspace.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a href="#pricing" style={{ background: dark, color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 28px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              Start for free <ArrowRight size={15} />
            </a>
            <a href="#features" style={{ background: "transparent", color: muted, fontSize: 15, fontWeight: 500, padding: "13px 28px", borderRadius: 10, border: "1px solid #d9c9b0", textDecoration: "none" }}>
              See features
            </a>
          </div>
          <div style={{ display: "flex", gap: 32, marginTop: 40 }}>
            {[["7+", "workspace modes"], ["AI", "built into flow"], ["Live", "team presence"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 22, fontWeight: 700, color: dark, fontFamily: serif }}>{v}</div>
                <div style={{ fontSize: 12, color: faint, marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${bd}`, borderRadius: 16, overflow: "hidden", boxShadow: "0 20px 60px rgba(100,70,20,0.12),0 4px 16px rgba(100,70,20,0.06)" }}>
          <div style={{ background: "#f9f5ef", borderBottom: `1px solid ${bd}`, padding: "12px 20px", display: "flex", alignItems: "center", gap: 8 }}>
            {["#f87171", "#fbbf24", "#4ade80"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "block" }} />)}
            <span style={{ marginLeft: 8, fontSize: 12, color: "#9c8a70", fontWeight: 500 }}>Launch workspace</span>
          </div>
          <div style={{ padding: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 14 }}>
              {[["Tasks", "42", "#d4ead9", "#2d6e47"], ["AI drafts", "18", "#e8daef", "#6b3fa0"], ["Events", "9", "#fdf0de", "#8b5a14"]].map(([label, val, bg, color]) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ fontSize: 11, color, fontWeight: 500, opacity: 0.75 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {[
                { col: "Plan", cbg: "#d4e4f5", ct: "#1a4f85", tasks: ["Research", "Brief"] },
                { col: "Build", cbg: "#fdf0de", ct: "#8b5a14", tasks: ["AI flow", "Whiteboard"] },
                { col: "Review", cbg: "#d4ead9", ct: "#2d6e47", tasks: ["Comments", "Calendar"] },
              ].map(({ col, cbg, ct, tasks }) => (
                <div key={col} style={{ background: "#faf8f5", border: `1px solid ${bd}`, borderRadius: 10, padding: 10 }}>
                  <span style={{ background: cbg, color: ct, fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100 }}>{col}</span>
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                    {tasks.map((t) => <div key={t} style={{ background: "#fff", border: `1px solid ${bd}`, borderRadius: 6, padding: "5px 8px", fontSize: 11, color: muted }}>{t}</div>)}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, background: "#f5f0fb", border: "1px solid #ddd0f0", borderRadius: 10, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <Bot size={14} color="#6b3fa0" style={{ marginTop: 1, flexShrink: 0 }} />
              <div style={{ fontSize: 11, color: "#6b3fa0", lineHeight: 1.5 }}>Done — 9 tasks, 3 reminders, and a review checklist created.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, desc, accent, border: b, ibg, ic }: any) {
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? accent : "#faf8f5", border: `1px solid ${hov ? b : bd}`, borderRadius: 14, padding: "24px 22px", transition: "all 0.2s", cursor: "default", transform: hov ? "translateY(-2px)" : "none" }}>
      <span style={{ width: 40, height: 40, borderRadius: 10, background: ibg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
        <Icon size={18} color={ic} />
      </span>
      <div style={{ fontSize: 15, fontWeight: 600, color: dark, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>{desc}</div>
    </div>
  );
}

function Features() {
  return (
    <section id="features" style={{ padding: "80px 24px", background: "#fff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: amber, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Features</p>
          <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: dark, margin: 0, lineHeight: 1.15 }}>Everything your team needs to think and ship</h2>
          <p style={{ fontSize: 16, color: muted, marginTop: 16, maxWidth: 520, marginInline: "auto", lineHeight: 1.7 }}>Planning, writing, visual thinking, AI generation, and collaboration in one polished workspace.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
          {FEATURES.map((f) => <FeatureCard key={f.title} {...f} />)}
        </div>
        <div style={{ marginTop: 48, background: "#f9f5ef", border: `1px solid ${bd}`, borderRadius: 16, padding: "36px 48px", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 32 }}>
          {STEPS.map(({ num, label, detail }) => (
            <div key={num} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <span style={{ fontFamily: serif, fontSize: 28, fontWeight: 700, color: "#e0ccaa", lineHeight: 1, flexShrink: 0 }}>{num}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: dark, marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>{detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ name, price, per, desc, items, cta, highlight }: any) {
  return (
    <div style={{ background: highlight ? dark : "#fff", border: highlight ? "none" : `1px solid ${bd}`, borderRadius: 16, padding: "32px 28px", position: "relative", boxShadow: highlight ? "0 24px 48px rgba(30,20,8,0.18)" : "none" }}>
      {highlight && <span style={{ position: "absolute", top: 20, right: 20, background: amber, color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 100 }}>Most popular</span>}
      <div style={{ fontSize: 16, fontWeight: 600, color: highlight ? "#f5ede0" : dark, marginBottom: 4 }}>{name}</div>
      <div style={{ fontSize: 12, color: highlight ? "#a08060" : faint, marginBottom: 20 }}>{desc}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 24 }}>
        <span style={{ fontFamily: serif, fontSize: 42, fontWeight: 700, color: highlight ? "#fff" : dark, lineHeight: 1 }}>{price}</span>
        <span style={{ fontSize: 13, color: highlight ? "#a08060" : faint }}>{per}</span>
      </div>
      <a href="/sign-up" style={{ display: "block", textAlign: "center", background: highlight ? amber : "transparent", color: highlight ? "#fff" : dark, border: highlight ? "none" : `1px solid #d9c9b0`, borderRadius: 9, padding: "11px 0", fontSize: 14, fontWeight: 600, textDecoration: "none", marginBottom: 24 }}>{cta}</a>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item: any) => (
          <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <Check size={14} color={highlight ? amber : "#4a9e6a"} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: highlight ? "#c8b89a" : muted, lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pricing() {
  return (
    <section id="pricing" style={{ padding: "80px 24px", background: "#faf8f5", borderTop: `1px solid ${bd}` }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: amber, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Pricing</p>
          <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 700, color: dark, margin: 0, lineHeight: 1.15 }}>Simple, honest pricing</h2>
          <p style={{ fontSize: 16, color: muted, marginTop: 14, lineHeight: 1.7 }}>Start free. Upgrade when you're ready.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, alignItems: "start" }}>
          {PLANS.map((p) => <PricingCard key={p.name} {...p} />)}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section style={{ padding: "80px 24px", background: "#fff", borderTop: `1px solid ${bd}` }}>
      <div style={{ maxWidth: 860, margin: "0 auto", textAlign: "center", background: "linear-gradient(135deg,#fdf8f0 0%,#f5ede0 100%)", border: "1px solid #e8d8b8", borderRadius: 20, padding: "64px 48px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #e8d8b8", borderRadius: 100, padding: "5px 16px", marginBottom: 24 }}>
          <Users2 size={13} color={amber} />
          <span style={{ fontSize: 12, fontWeight: 600, color: "#8b5a14" }}>Trusted by teams everywhere</span>
        </div>
        <h2 style={{ fontFamily: serif, fontSize: 44, fontWeight: 700, color: dark, margin: "0 0 18px", lineHeight: 1.12 }}>
          Build your entire productivity<br />system in one workspace
        </h2>
        <p style={{ fontSize: 16, color: muted, margin: "0 0 36px", lineHeight: 1.7, maxWidth: 480, marginInline: "auto" }}>
          Start with notes and tasks, then grow into AI planning, visual thinking, and real-time collaboration.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/sign-up" style={{ background: amber, color: "#fff", fontSize: 15, fontWeight: 600, padding: "13px 32px", borderRadius: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            Start for free <ArrowRight size={15} />
          </a>
          <a href="#features" style={{ background: "#fff", color: dark, fontSize: 15, fontWeight: 500, padding: "13px 32px", borderRadius: 10, border: "1px solid #d9c9b0", textDecoration: "none" }}>
            See all features
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ background: "#faf8f5", borderTop: `1px solid ${bd}`, padding: "36px 24px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 30, height: 30, borderRadius: 8, background: amber, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Sparkles size={13} color="#fff" />
          </span>
          <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 700, color: dark }}>Flowbase</span>
        </div>
        <div style={{ display: "flex", gap: 24 }}>
          {["Features", "Pricing", "Privacy", "Terms"].map((l) => (
            <a key={l} href="#" style={{ fontSize: 13, color: faint, textDecoration: "none" }}>{l}</a>
          ))}
        </div>
        <p style={{ fontSize: 12, color: "#a09080", margin: 0 }}>© 2026 Flowbase. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#fff", minHeight: "100vh" }}>
        <NavBar />
        <Hero />
        <Features />
        <Pricing />
        <CTA />
        <Footer />
      </div>
    </>
  );
}