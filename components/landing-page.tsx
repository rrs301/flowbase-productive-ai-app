import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bot,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  Clock3,
  Columns3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  LayoutTemplate,
  LucideIcon,
  MessageSquareText,
  MousePointer2,
  Network,
  PenLine,
  PenTool,
  Play,
  Quote,
  Rocket,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users2,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "clay" | "sage" | "amber" | "sky" | "violet" | "rose" | "slate";

type IconItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
};

const toneStyles: Record<Tone, { icon: string; card: string; text: string; soft: string; border: string }> = {
  clay: {
    icon: "bg-clay-100 text-clay-700 ring-clay-200",
    card: "from-clay-100/90 via-white to-card",
    text: "text-clay-700",
    soft: "bg-clay-100 text-clay-800",
    border: "border-clay-200/80",
  },
  sage: {
    icon: "bg-sage-100 text-sage-700 ring-sage-200",
    card: "from-sage-100/90 via-white to-card",
    text: "text-sage-700",
    soft: "bg-sage-100 text-sage-800",
    border: "border-sage-200/80",
  },
  amber: {
    icon: "bg-amber-100 text-amber-700 ring-amber-200",
    card: "from-amber-100/90 via-white to-card",
    text: "text-amber-700",
    soft: "bg-amber-100 text-amber-800",
    border: "border-amber-200/80",
  },
  sky: {
    icon: "bg-sky-100 text-sky-700 ring-sky-200",
    card: "from-sky-100/80 via-white to-card",
    text: "text-sky-700",
    soft: "bg-sky-100 text-sky-800",
    border: "border-sky-200/80",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700 ring-violet-200",
    card: "from-violet-100/80 via-white to-card",
    text: "text-violet-700",
    soft: "bg-violet-100 text-violet-800",
    border: "border-violet-200/80",
  },
  rose: {
    icon: "bg-rose-100 text-rose-700 ring-rose-200",
    card: "from-rose-100/80 via-white to-card",
    text: "text-rose-700",
    soft: "bg-rose-100 text-rose-800",
    border: "border-rose-200/80",
  },
  slate: {
    icon: "bg-stone-100 text-stone-700 ring-stone-200",
    card: "from-stone-100/80 via-white to-card",
    text: "text-stone-700",
    soft: "bg-stone-100 text-stone-800",
    border: "border-stone-200/80",
  },
};

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "Showcase", href: "#showcase" },
  { label: "AI", href: "#ai" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

const trustBadges = [
  { label: "AI Assistant", icon: Bot, tone: "violet" },
  { label: "Real-time Collaboration", icon: Users2, tone: "sage" },
  { label: "Smart Workspace", icon: Sparkles, tone: "clay" },
] satisfies Array<{ label: string; icon: LucideIcon; tone: Tone }>;

const features: IconItem[] = [
  {
    title: "AI Assistant",
    description: "Turn fuzzy ideas into tasks, plans, notes, reminders, and next steps in seconds.",
    icon: Bot,
    tone: "violet",
  },
  {
    title: "Smart Dashboard",
    description: "See work, calendar events, notes, whiteboards, and AI activity in one calm command center.",
    icon: LayoutDashboard,
    tone: "clay",
  },
  {
    title: "Calendar & Reminders",
    description: "Schedule priorities, capture reminders, and keep upcoming work visible without context switching.",
    icon: CalendarClock,
    tone: "sage",
  },
  {
    title: "Kanban / Task Boards",
    description: "Move projects from idea to done with flexible task boards built for personal and team flow.",
    icon: Columns3,
    tone: "amber",
  },
  {
    title: "Notion-style Notes",
    description: "Draft structured notes, specs, research, and plans with a focused editor made for deep work.",
    icon: FileText,
    tone: "sky",
  },
  {
    title: "Miro-style Whiteboard",
    description: "Map ideas, sketch workflows, and create diagrams in a visual canvas beside your actual work.",
    icon: PenTool,
    tone: "rose",
  },
  {
    title: "AI Template Builder",
    description: "Generate lightweight internal tools and reusable workspace templates from plain language.",
    icon: LayoutTemplate,
    tone: "violet",
  },
  {
    title: "Live Collaboration",
    description: "Coordinate with shared boards, presence, comments, and team context powered by real-time sync.",
    icon: Network,
    tone: "sage",
  },
  {
    title: "Custom Categories",
    description: "Tune categories, labels, and settings so Flowbase mirrors how your team already thinks.",
    icon: Settings2,
    tone: "slate",
  },
];

const aiFeatures: IconItem[] = [
  {
    title: "Create tasks from prompts",
    description: "Ask AI for action items and get organized task drafts with owners, due dates, and context.",
    icon: CheckCircle2,
    tone: "sage",
  },
  {
    title: "Add calendar reminders",
    description: "Convert commitments into scheduled reminders without leaving your workspace.",
    icon: Clock3,
    tone: "amber",
  },
  {
    title: "Refine note content",
    description: "Rewrite, summarize, expand, or clarify notes while keeping your original thinking close.",
    icon: PenLine,
    tone: "sky",
  },
  {
    title: "Generate diagrams",
    description: "Move from messy ideas to clear systems maps, whiteboard flows, and planning visuals.",
    icon: Workflow,
    tone: "rose",
  },
  {
    title: "Build templates",
    description: "Describe the mini app, tracker, or workspace you need and let AI shape the starting point.",
    icon: WandSparkles,
    tone: "violet",
  },
  {
    title: "Productivity insights",
    description: "Understand what is moving, what is stuck, and where your team should focus next.",
    icon: BarChart3,
    tone: "clay",
  },
];

const useCases = [
  ["Founders", "Plan launches, investor updates, product specs, and team operating rhythm."],
  ["Students", "Bring classes, research notes, study plans, and reminders into one reliable hub."],
  ["Teams", "Coordinate projects with shared boards, live context, and fewer scattered tools."],
  ["Creators", "Shape content calendars, drafts, briefs, visual ideas, and production pipelines."],
  ["Project managers", "Track priorities, blockers, milestones, and cross-functional execution."],
  ["Personal productivity", "Build a private system for goals, notes, planning, and daily follow-through."],
];

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    description: "For getting your personal productivity system online.",
    features: ["Dashboard, notes, and tasks", "Basic calendar planning", "Limited AI assistant usage", "Personal whiteboards"],
    cta: "Start for free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$16",
    description: "For power users building a complete AI workspace.",
    features: ["Unlimited notes and boards", "Advanced AI assistant actions", "AI template builder", "Productivity insights", "Priority workspace history"],
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
    name: "Team",
    price: "$39",
    description: "For teams that need shared planning and live collaboration.",
    features: ["Shared Kanban and spaces", "Live presence and comments", "Team categories and controls", "Admin-ready collaboration", "Priority support"],
    cta: "Start team plan",
    highlight: false,
  },
];

const testimonials = [
  {
    quote:
      "Flowbase gives our team a single place to think, plan, and execute. The AI layer feels practical, not decorative.",
    name: "Maya Chen",
    role: "Founder, Northstar Labs",
  },
  {
    quote:
      "We replaced scattered notes, project boards, and planning docs with one workspace that people actually enjoy opening.",
    name: "Elliot Harper",
    role: "Product Lead, StudioNine",
  },
  {
    quote:
      "The template builder is the difference maker. It helps us turn one-off processes into repeatable systems fast.",
    name: "Priya Raman",
    role: "Operations Director, Lumos",
  },
];

const faqs = [
  {
    question: "What can the AI Assistant do?",
    answer:
      "It helps create tasks, reminders, notes, outlines, diagrams, templates, and workspace summaries from natural language prompts.",
  },
  {
    question: "How does real-time collaboration work?",
    answer:
      "Teams can work together with shared boards, active presence, comments, and collaborative workspace updates powered by Liveblocks.",
  },
  {
    question: "Can I use Flowbase for long-form notes?",
    answer:
      "Yes. Flowbase includes a structured notes editor for specs, research, meeting notes, knowledge bases, and planning docs.",
  },
  {
    question: "Is the whiteboard for diagrams or brainstorming?",
    answer:
      "Both. Use it for visual planning, systems thinking, quick diagrams, workshop boards, and project mapping.",
  },
  {
    question: "What is the AI Template Builder?",
    answer:
      "It turns plain-language requests into reusable workspace templates and lightweight internal tools for recurring workflows.",
  },
  {
    question: "How is data privacy handled?",
    answer:
      "The landing page avoids collecting data. In-app privacy controls should follow your configured authentication, database, and AI provider policies.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("mx-auto max-w-3xl", align === "center" ? "text-center" : "mx-0 text-left")}>
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
    </div>
  );
}

function IconBadge({ icon: Icon, tone }: { icon: LucideIcon; tone: Tone }) {
  return (
    <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-lg ring-1", toneStyles[tone].icon)}>
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

function FeatureCard({ item }: { item: IconItem }) {
  return (
    <Card
      className={cn(
        "group h-full overflow-hidden rounded-lg border bg-gradient-to-br shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl",
        toneStyles[item.tone].card,
        toneStyles[item.tone].border,
      )}
    >
      <CardContent className="flex h-full flex-col gap-5 p-6">
        <IconBadge icon={item.icon} tone={item.tone} />
        <div>
          <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniDashboardMockup() {
  const columns = [
    { title: "Plan", color: "bg-sky-100 text-sky-700", tasks: ["Launch checklist", "Research notes"] },
    { title: "Build", color: "bg-amber-100 text-amber-700", tasks: ["AI task flow", "Whiteboard map"] },
    { title: "Review", color: "bg-sage-100 text-sage-700", tasks: ["Team comments", "Calendar sync"] },
  ];

  return (
    <div className="rounded-xl border border-white/70 bg-white/80 p-3 shadow-2xl shadow-clay-800/10 backdrop-blur md:p-4">
      <div className="rounded-lg border border-border bg-background/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Flowbase command center
            </p>
            <h3 className="mt-2 text-xl font-semibold">Launch workspace</h3>
          </div>
          <div className="flex -space-x-2">
            {["MC", "ER", "PR"].map((initials, index) => (
              <span
                key={initials}
                className={cn(
                  "flex size-9 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold",
                  index === 0 && "bg-clay-100 text-clay-700",
                  index === 1 && "bg-sage-100 text-sage-700",
                  index === 2 && "bg-violet-100 text-violet-700",
                )}
              >
                {initials}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-3 py-4 sm:grid-cols-3">
          {[
            ["Tasks completed", "42", "bg-sage-100 text-sage-700"],
            ["AI drafts", "18", "bg-violet-100 text-violet-700"],
            ["This week", "9 events", "bg-amber-100 text-amber-700"],
          ].map(([label, value, style]) => (
            <div key={label} className="rounded-lg border border-border bg-card p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
              <span className={cn("mt-3 inline-flex rounded-full px-2 py-1 text-[11px] font-semibold", style)}>
                on track
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold">AI brief</p>
              <Bot className="size-4 text-violet-600" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {["Create launch tasks", "Summarize notes", "Draft reminders"].map((task) => (
                <div key={task} className="flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                  <Check className="size-3.5 text-sage-600" aria-hidden="true" />
                  {task}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title} className="rounded-lg border border-border bg-card p-3 shadow-sm">
                <span className={cn("rounded-full px-2 py-1 text-[11px] font-semibold", column.color)}>{column.title}</span>
                <div className="mt-3 space-y-2">
                  {column.tasks.map((task) => (
                    <div key={task} className="rounded-md border border-border bg-background p-2 text-xs text-muted-foreground">
                      {task}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShowcasePanel({
  title,
  description,
  icon: Icon,
  tone,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden rounded-lg border-border bg-card/90 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <CardContent className="p-5">
        <div className="mb-5 flex items-start gap-3">
          <IconBadge icon={Icon} tone={tone} />
          <div>
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Flowbase home">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate text-sm font-semibold">Flowbase</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-card hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-lg sm:inline-flex">
              <Link href="#showcase">
                <Play className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                Watch Demo
              </Link>
            </Button>
            <Button asChild className="rounded-lg shadow-lg shadow-clay-600/15">
              <Link href="/sign-up">
                Get Started
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <section className="relative border-b border-border/70 bg-[linear-gradient(180deg,hsl(42_82%_97%)_0%,hsl(0_0%_100%/.75)_58%,hsl(42_82%_97%)_100%)]">
        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="max-w-3xl">
            <div className="flex flex-wrap gap-2">
              {trustBadges.map(({ label, icon: Icon, tone }) => (
                <span
                  key={label}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1",
                    toneStyles[tone].soft,
                    toneStyles[tone].border,
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>
            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.08] text-foreground sm:text-5xl lg:text-6xl">
              Your AI-powered workspace for notes, tasks, whiteboards, and team collaboration
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Flowbase combines Notion-style notes, Miro-style whiteboards, Kanban boards, calendar planning,
              AI assistance, template building, and real-time collaboration in one modern workspace.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 rounded-lg px-6 text-base shadow-xl shadow-clay-600/15">
                <Link href="/sign-up">
                  Get Started
                  <ArrowRight className="ml-2 size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-lg border-border bg-card/80 px-6 text-base">
                <Link href="#showcase">
                  <Play className="mr-2 size-4 text-sage-600" aria-hidden="true" />
                  Watch Demo
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              {[
                ["7+", "workspace modes"],
                ["AI", "built into flow"],
                ["Live", "team presence"],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-border bg-card/75 p-3 shadow-sm">
                  <p className="text-xl font-semibold text-foreground">{value}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <MiniDashboardMockup />
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Feature Highlights"
          title="One workspace for every way your team thinks and ships"
          description="Flowbase brings planning, writing, visual thinking, AI generation, and collaboration into a single polished operating system."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} item={feature} />
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="How It Works"
            title="A calmer path from idea to execution"
            description="Flowbase keeps your work organized while AI handles the blank-page moments and collaboration keeps everyone aligned."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Organize your workspace", "Bring notes, tasks, calendars, whiteboards, and categories into one shared system.", FolderKanban, "clay"],
              ["02", "Let AI help you plan and create", "Ask for task lists, reminders, summaries, diagrams, and reusable templates.", BrainCircuit, "violet"],
              ["03", "Collaborate and track progress", "Share boards, comment on work, monitor progress, and keep momentum visible.", Rocket, "sage"],
            ].map(([step, title, description, Icon, tone]) => (
              <Card key={String(title)} className="rounded-lg border-border bg-background shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-muted-foreground">{String(step)}</span>
                    <IconBadge icon={Icon as LucideIcon} tone={tone as Tone} />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold">{String(title)}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{String(description)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="showcase" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Product Showcase"
          title="Product-specific mockups that preview the real workspace"
          description="Each view is designed around the way Flowbase already works: dashboards, notes, boards, whiteboards, and AI assistance."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <ShowcasePanel
            title="Dashboard overview"
            description="A calm command center for tasks, calendar, notes, and AI activity."
            icon={LayoutDashboard}
            tone="clay"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {["Tasks", "Calendar", "AI"].map((label, index) => (
                <div key={label} className="rounded-lg border border-border bg-background p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-3 text-2xl font-semibold">{["24", "8", "12"][index]}</p>
                  <div className="mt-4 h-2 rounded-full bg-muted">
                    <div className={cn("h-2 rounded-full", index === 0 && "w-4/5 bg-clay-400", index === 1 && "w-2/3 bg-sage-400", index === 2 && "w-3/5 bg-violet-400")} />
                  </div>
                </div>
              ))}
            </div>
          </ShowcasePanel>

          <ShowcasePanel title="Notes editor" description="Structured writing for research, plans, specs, and meeting notes." icon={FileText} tone="sky">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="h-4 w-2/3 rounded bg-sky-100" />
              <div className="mt-4 space-y-2">
                <div className="h-2.5 rounded bg-muted" />
                <div className="h-2.5 w-5/6 rounded bg-muted" />
                <div className="h-2.5 w-3/4 rounded bg-muted" />
              </div>
              <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-800">
                AI suggestion: tighten the launch brief and turn action items into tasks.
              </div>
            </div>
          </ShowcasePanel>

          <ShowcasePanel title="Kanban board" description="Shared task boards with practical status, comments, and progress." icon={Columns3} tone="amber">
            <div className="grid gap-3 sm:grid-cols-3">
              {["Backlog", "In progress", "Done"].map((status) => (
                <div key={status} className="rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground">{status}</p>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-md border border-border bg-card p-2 text-xs">Sprint planning</div>
                    <div className="rounded-md border border-border bg-card p-2 text-xs">Customer notes</div>
                  </div>
                </div>
              ))}
            </div>
          </ShowcasePanel>

          <ShowcasePanel title="Whiteboard" description="A visual canvas for diagrams, systems maps, and creative planning." icon={PenTool} tone="rose">
            <div className="relative min-h-48 rounded-lg border border-border bg-background p-4">
              <div className="absolute left-8 top-8 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">
                Idea
              </div>
              <div className="absolute left-1/2 top-20 rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-sm font-semibold text-sage-800">
                Plan
              </div>
              <div className="absolute bottom-7 right-8 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-800">
                Ship
              </div>
              <div className="absolute left-[34%] top-[34%] h-px w-28 rotate-12 bg-border" />
              <div className="absolute bottom-[34%] right-[28%] h-px w-24 rotate-12 bg-border" />
            </div>
          </ShowcasePanel>

          <ShowcasePanel title="AI Assistant" description="A productivity copilot that can act across the workspace." icon={Bot} tone="violet">
            <div className="rounded-lg border border-border bg-background p-4">
              <div className="rounded-lg bg-violet-100 p-3 text-sm leading-6 text-violet-900">
                Create a launch plan from this note and add reminders for the critical dates.
              </div>
              <div className="mt-3 rounded-lg border border-border bg-card p-3 text-sm leading-6 text-muted-foreground">
                Done. I drafted 9 tasks, 3 calendar reminders, and a review checklist.
              </div>
            </div>
          </ShowcasePanel>

          <ShowcasePanel title="Template builder" description="Turn recurring workflows into generated workspace systems." icon={LayoutTemplate} tone="clay">
            <div className="grid gap-3 sm:grid-cols-2">
              {["Content tracker", "Client portal", "Hiring pipeline", "OKR dashboard"].map((template) => (
                <div key={template} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm font-medium">
                  <LayoutTemplate className="size-4 text-clay-600" aria-hidden="true" />
                  {template}
                </div>
              ))}
            </div>
          </ShowcasePanel>
        </div>
      </section>

      <section id="ai" className="border-y border-border/70 bg-card/55">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div>
            <SectionHeader
              eyebrow="AI Features"
              title="AI that creates useful work, not just clever text"
              description="Ask Flowbase to plan, refine, schedule, diagram, build, and summarize inside the same workspace where your team executes."
              align="left"
            />
            <div className="mt-8 rounded-lg border border-border bg-background p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <IconBadge icon={Zap} tone="amber" />
                <div>
                  <p className="font-semibold">From prompt to workspace action</p>
                  <p className="mt-1 text-sm text-muted-foreground">Tasks, reminders, diagrams, notes, and templates stay connected.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {aiFeatures.map((feature) => (
              <FeatureCard key={feature.title} item={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
        <div>
          <SectionHeader
            eyebrow="Collaboration"
            title="Real-time teamwork without the tool sprawl"
            description="Flowbase keeps teams present in the same planning system with shared boards, comments, workspace context, and Liveblocks-powered collaboration."
            align="left"
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {["Shared Kanban boards", "Active user presence", "Task comments", "Liveblocks-powered sync", "Team workspace experience", "Shared planning context"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 text-sm font-medium shadow-sm">
                <CheckCircle2 className="size-4 text-sage-600" aria-hidden="true" />
                {item}
              </div>
            ))}
          </div>
        </div>
        <Card className="rounded-lg border-border bg-card shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <p className="font-semibold">Team launch board</p>
              <div className="flex -space-x-2">
                {["AM", "JL", "SK", "TY"].map((name) => (
                  <span key={name} className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-sage-100 text-[10px] font-semibold text-sage-800">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquareText className="size-4 text-clay-600" aria-hidden="true" />
                  Product review
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Maya left feedback on pricing copy and assigned follow-up tasks.</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MousePointer2 className="size-4 text-violet-600" aria-hidden="true" />
                  Live presence
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Three teammates are editing the launch workspace right now.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border/70 bg-card/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Use Cases"
            title="Built for focused people and ambitious teams"
            description="Flowbase adapts from solo planning to team operations without forcing everyone into another rigid project management template."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map(([title, description]) => (
              <Card key={title} className="rounded-lg border-border bg-background shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <CardContent className="p-6">
                  <BadgeCheck className="size-5 text-primary" aria-hidden="true" />
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple plans for individuals and teams"
          description="Start with a personal workspace, then grow into advanced AI workflows and real-time team collaboration."
        />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative rounded-lg border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
                plan.highlight ? "border-primary shadow-xl shadow-clay-600/10" : "border-border",
              )}
            >
              {plan.highlight && (
                <span className="absolute right-5 top-5 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </span>
              )}
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-4xl font-semibold">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">/mo</span>
                </div>
                <Button asChild variant={plan.highlight ? "default" : "outline"} className="mt-6 w-full rounded-lg">
                  <Link href="/sign-up">{plan.cta}</Link>
                </Button>
                <div className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-sage-600" aria-hidden="true" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border/70 bg-card/55">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Testimonials"
            title="Teams choose Flowbase when work needs fewer handoffs"
            description="Placeholder stories for the kind of polished, professional proof points the page is ready to support."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {testimonials.map((testimonial) => (
              <Card key={testimonial.name} className="rounded-lg border-border bg-background shadow-sm">
                <CardContent className="p-6">
                  <Quote className="size-6 text-primary" aria-hidden="true" />
                  <p className="mt-5 text-base leading-7 text-foreground">{testimonial.quote}</p>
                  <div className="mt-6 border-t border-border pt-5">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="FAQ"
          title="Common questions before you build your workspace"
          description="A quick pass through the core AI, collaboration, notes, whiteboard, template, and privacy questions."
        />
        <div className="mt-12 grid gap-4 lg:grid-cols-2">
          {faqs.map((faq) => (
            <Card key={faq.question} className="rounded-lg border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-base font-semibold">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-xl border border-border bg-foreground p-8 text-background shadow-2xl shadow-clay-800/10 sm:p-12 lg:p-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-clay-200">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Final CTA
              </p>
              <h2 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight sm:text-5xl">
                Build your entire productivity system in one AI workspace
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-background/72">
                Start with notes and tasks, then connect AI planning, visual thinking, calendar reminders, templates,
                and collaboration as your work grows.
              </p>
            </div>
            <Button asChild size="lg" className="h-12 rounded-lg bg-background px-6 text-base text-foreground hover:bg-background/90">
              <Link href="/sign-up">
                Start for Free
                <ArrowRight className="ml-2 size-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card/70">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.3fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="size-4" aria-hidden="true" />
              </span>
              <span className="font-semibold">Flowbase</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              A premium AI productivity workspace for planning, notes, whiteboards, tasks, templates, and collaborative teams.
            </p>
          </div>
          {[
            ["Product", "Features", "Showcase", "Pricing", "AI Assistant"],
            ["Resources", "Templates", "Demo", "Use cases", "Docs"],
            ["Legal", "Privacy", "Terms", "Security", "Contact"],
          ].map(([heading, ...links]) => (
            <div key={heading}>
              <p className="text-sm font-semibold">{heading}</p>
              <div className="mt-4 space-y-3">
                {links.map((link) => (
                  <Link key={link} href="#" className="block text-sm text-muted-foreground transition hover:text-foreground">
                    {link}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>Copyright 2026 Flowbase. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="transition hover:text-foreground">
                X
              </Link>
              <Link href="#" className="transition hover:text-foreground">
                LinkedIn
              </Link>
              <Link href="#" className="transition hover:text-foreground">
                GitHub
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
