import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  LayoutDashboard,
  Menu,
  Moon,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  TimerReset,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

type Category = "morning" | "deep-work" | "health" | "craft";
type Priority = "low" | "medium" | "high";
type Energy = "low" | "medium" | "high";
type CategoryFilter = "all" | Category;

interface Ritual {
  id: string;
  title: string;
  category: Category;
  duration_minutes: number;
  frequency: string;
  priority: Priority;
  energy: Energy;
  emoji: string;
  completed: boolean;
  streak: number;
}

interface RitualCreatePayload {
  title: string;
  category: Category;
  duration_minutes: number;
  frequency: string;
  priority: Priority;
  energy: Energy;
  emoji: string;
}

const categoryLabels: Record<CategoryFilter, string> = {
  all: "All rituals",
  morning: "Morning",
  "deep-work": "Deep work",
  health: "Health",
  craft: "Craft",
};

const categoryStyles: Record<Category, string> = {
  morning: "bg-amber-500/12 text-amber-600 dark:text-amber-300",
  "deep-work": "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300",
  health: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300",
  craft: "bg-rose-500/12 text-rose-600 dark:text-rose-300",
};

const initialForm: RitualCreatePayload = {
  title: "",
  category: "deep-work",
  duration_minutes: 25,
  frequency: "Every day",
  priority: "medium",
  energy: "medium",
  emoji: "✦",
};

const fetchRituals = () => apiGet<Ritual[]>("/rituals");

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function NavItem({
  icon,
  label,
  active = false,
  onClick,
  testId,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-[background-color,color,transform] hover:translate-x-0.5 ${
        active
          ? "bg-primary text-primary-foreground shadow-[0_8px_24px_-12px_var(--primary)]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {icon}
      <span data-testid={`${testId}-label`}>{label}</span>
    </button>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone,
  testId,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: string;
  testId: string;
}) {
  return (
    <Card data-testid={testId} className="border-0 bg-card/80 p-5 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.7)] ring-1 ring-border/70 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <span className={`flex size-9 items-center justify-center rounded-xl ${tone}`} data-testid={`${testId}-icon`}>
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground" data-testid={`${testId}-detail`}>
          {detail}
        </span>
      </div>
      <div className="mt-6" data-testid={`${testId}-content`}>
        <p className="font-heading text-3xl font-semibold tracking-tight" data-testid={`${testId}-value`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground" data-testid={`${testId}-label`}>{label}</p>
      </div>
    </Card>
  );
}

function RitualCard({ ritual, onToggle }: { ritual: Ritual; onToggle: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      data-testid={`ritual-card-item-${ritual.id}`}
    >
      <Card className={`group border-0 p-4 ring-1 transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:shadow-xl ${ritual.completed ? "bg-muted/45 ring-border/50" : "bg-card ring-border/70"}`}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => onToggle(ritual.id)}
            data-testid={`ritual-checkbox-${ritual.id}`}
            aria-label={ritual.completed ? `Reopen ${ritual.title}` : `Complete ${ritual.title}`}
            className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,transform] hover:scale-105 ${ritual.completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-transparent hover:border-primary"}`}
          >
            <Check className="size-3.5" strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xl" data-testid={`ritual-emoji-${ritual.id}`}>{ritual.emoji}</span>
                <div className="min-w-0">
                  <h3 className={`truncate text-sm font-medium ${ritual.completed ? "text-muted-foreground line-through" : "text-foreground"}`} data-testid={`ritual-title-${ritual.id}`}>
                    {ritual.title}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground" data-testid={`ritual-meta-${ritual.id}`}>
                    <Clock3 className="size-3" /> {ritual.duration_minutes} min <span className="text-border">·</span> {ritual.frequency}
                  </p>
                </div>
              </div>
              <button type="button" aria-label={`More options for ${ritual.title}`} data-testid={`ritual-more-${ritual.id}`} className="rounded-lg p-1 text-muted-foreground opacity-60 transition-[background-color,color,opacity] hover:bg-muted hover:text-foreground hover:opacity-100">
                <MoreHorizontal className="size-4" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Badge variant="ghost" className={`h-6 rounded-lg px-2 text-[10px] uppercase tracking-wider ${categoryStyles[ritual.category]}`} data-testid={`ritual-category-${ritual.id}`}>
                {categoryLabels[ritual.category]}
              </Badge>
              <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground" data-testid={`ritual-streak-${ritual.id}`}>
                <Flame className="size-3.5 text-amber-500" /> {ritual.streak} day streak
              </span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function CreateRitualModal({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: RitualCreatePayload) => void;
  isSubmitting: boolean;
}) {
  const [form, setForm] = useState<RitualCreatePayload>(initialForm);

  useEffect(() => {
    if (open) setForm(initialForm);
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof RitualCreatePayload>(key: K, value: RitualCreatePayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" data-testid="create-ritual-modal">
      <motion.div initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-lg rounded-t-3xl border border-white/10 bg-card p-6 shadow-2xl sm:rounded-3xl" data-testid="create-ritual-modal-content">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary" data-testid="create-ritual-kicker">New ritual</p>
            <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight" data-testid="create-ritual-title">Make space for what matters</h2>
            <p className="mt-1 text-sm text-muted-foreground" data-testid="create-ritual-description">Keep it small enough to start today.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close create ritual" data-testid="create-ritual-close-button" className="rounded-full p-2 text-muted-foreground transition-[background-color,color,transform] hover:rotate-90 hover:bg-muted hover:text-foreground">
            <X className="size-5" />
          </button>
        </div>
        <form onSubmit={(event) => { event.preventDefault(); onSubmit(form); }} className="mt-6 space-y-4" data-testid="create-ritual-modal-form">
          <div>
            <label htmlFor="ritual-title" className="mb-2 block text-xs font-medium text-muted-foreground">Ritual name</label>
            <Input id="ritual-title" required value={form.title} onChange={(event) => update("title", event.target.value)} placeholder="e.g. Read 10 pages" data-testid="create-ritual-title-input" className="h-11 bg-background/70" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ritual-category" className="mb-2 block text-xs font-medium text-muted-foreground">Category</label>
              <select id="ritual-category" value={form.category} onChange={(event) => update("category", event.target.value as Category)} data-testid="create-ritual-category-select" className="h-11 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30">
                {Object.entries(categoryLabels).filter(([key]) => key !== "all").map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ritual-duration" className="mb-2 block text-xs font-medium text-muted-foreground">Minutes</label>
              <Input id="ritual-duration" type="number" min={5} max={180} required value={form.duration_minutes} onChange={(event) => update("duration_minutes", Number(event.target.value))} data-testid="create-ritual-duration-input" className="h-11 bg-background/70" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ritual-frequency" className="mb-2 block text-xs font-medium text-muted-foreground">Cadence</label>
              <Input id="ritual-frequency" required value={form.frequency} onChange={(event) => update("frequency", event.target.value)} data-testid="create-ritual-frequency-input" className="h-11 bg-background/70" />
            </div>
            <div>
              <label htmlFor="ritual-emoji" className="mb-2 block text-xs font-medium text-muted-foreground">Icon</label>
              <Input id="ritual-emoji" required maxLength={4} value={form.emoji} onChange={(event) => update("emoji", event.target.value)} data-testid="create-ritual-emoji-input" className="h-11 bg-background/70" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose} data-testid="create-ritual-cancel-button">Cancel</Button>
            <Button type="submit" disabled={isSubmitting || !form.title.trim()} data-testid="create-ritual-submit-button" className="gap-2">
              <Plus className="size-4" /> {isSubmitting ? "Saving..." : "Add ritual"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function MobileSimulator({ rituals, onClose, onToggle }: { rituals: Ritual[]; onClose: () => void; onToggle: (id: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" role="dialog" aria-modal="true" data-testid="mobile-simulator-modal">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col items-center gap-5 overflow-auto rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-2xl sm:p-8 lg:flex-row lg:justify-center" data-testid="mobile-simulator-content">
        <div className="hidden max-w-xs lg:block">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-indigo-300" data-testid="mobile-simulator-kicker">Expo bridge</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold tracking-tight text-white" data-testid="mobile-simulator-title">Your mobile flow, now with room to breathe.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400" data-testid="mobile-simulator-description">A small preview of the same ritual flow, translated into a touch-first viewport.</p>
        </div>
        <div className="w-full max-w-[290px] rounded-[2.4rem] border-[7px] border-slate-700 bg-slate-950 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" data-testid="mobile-simulator-device">
          <div className="overflow-hidden rounded-[1.8rem] bg-background">
            <div className="flex items-center justify-between px-5 pb-2 pt-4 text-[10px] font-semibold text-muted-foreground"><span data-testid="mobile-simulator-time">9:41</span><span className="h-1.5 w-14 rounded-full bg-foreground/15" /></div>
            <div className="border-b border-border/60 px-5 pb-4 pt-3">
              <div className="flex items-center justify-between"><div><p className="text-[10px] uppercase tracking-widest text-primary" data-testid="mobile-simulator-greeting">Tuesday, 24 Sep</p><h3 className="mt-1 font-heading text-lg font-semibold" data-testid="mobile-simulator-heading">Good morning, Alex</h3></div><div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></div></div>
              <div className="mt-4 rounded-2xl bg-primary p-4 text-primary-foreground"><div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-widest opacity-70" data-testid="mobile-simulator-progress-label">Today</span><span className="text-xs" data-testid="mobile-simulator-progress-value">2 / 4</span></div><div className="mt-3 h-1.5 rounded-full bg-white/20"><div className="h-full w-1/2 rounded-full bg-white" /></div></div>
            </div>
            <div className="space-y-2 p-4" data-testid="mobile-simulator-ritual-list">
              {rituals.slice(0, 3).map((ritual) => <button type="button" key={ritual.id} onClick={() => onToggle(ritual.id)} data-testid={`mobile-simulator-ritual-${ritual.id}`} className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card p-3 text-left"><span className={`flex size-8 items-center justify-center rounded-xl ${categoryStyles[ritual.category]}`}>{ritual.emoji}</span><span className="min-w-0 flex-1"><span className={`block truncate text-xs font-medium ${ritual.completed ? "text-muted-foreground line-through" : ""}`}>{ritual.title}</span><span className="mt-1 block text-[10px] text-muted-foreground">{ritual.duration_minutes} min</span></span><span className={`flex size-5 items-center justify-center rounded-full border ${ritual.completed ? "border-primary bg-primary text-primary-foreground" : "border-border text-transparent"}`}><Check className="size-3" /></span></button>)}
            </div>
            <div className="flex items-center justify-around border-t border-border/60 bg-card px-3 py-3 text-muted-foreground"><LayoutDashboard className="size-4 text-primary" /><CalendarDays className="size-4" /><Plus className="size-4" /><Activity className="size-4" /></div>
          </div>
        </div>
        <button type="button" onClick={onClose} data-testid="mobile-simulator-close-button" className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition-[background-color,transform] hover:rotate-90 hover:bg-white/20" aria-label="Close mobile simulator"><X className="size-5" /></button>
      </div>
    </div>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const ritualsQuery = useQuery({ queryKey: ["rituals"], queryFn: fetchRituals, retry: false });
  const [filter, setFilter] = useState<CategoryFilter>("all");
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => typeof window === "undefined" || localStorage.getItem("pulse-theme") !== "light");
  const [timerRunning, setTimerRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [soundscape, setSoundscape] = useState("Lo-fi cafe");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("pulse-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => setSecondsLeft((current) => current > 0 ? current - 1 : 25 * 60), 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  const createMutation = useMutation({
    mutationFn: (payload: RitualCreatePayload) => apiPost<Ritual>("/rituals", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rituals"] });
      setIsCreateOpen(false);
      toast.success("Ritual added to your flow");
    },
    onError: () => toast.error("Could not save this ritual. Try again."),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch<Ritual>(`/rituals/${id}/toggle`),
    onSuccess: (ritual) => {
      void queryClient.invalidateQueries({ queryKey: ["rituals"] });
      toast.success(ritual.completed ? "Nice work. Keep the rhythm." : "Ritual reopened");
    },
    onError: () => toast.error("Could not update this ritual."),
  });

  const rituals = ritualsQuery.data ?? [];
  const filteredRituals = useMemo(() => rituals.filter((ritual) => {
    const matchesCategory = filter === "all" || ritual.category === filter;
    const matchesSearch = ritual.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  }), [filter, rituals, search]);
  const completedCount = rituals.filter((ritual) => ritual.completed).length;
  const completion = rituals.length ? Math.round((completedCount / rituals.length) * 100) : 0;
  const focusMinutes = rituals.reduce((total, ritual) => total + ritual.duration_minutes, 0);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground" data-testid="pulse-app">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(99,102,241,0.13),transparent_28rem)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[240px_1fr]">
        <aside className="hidden border-r border-border/70 bg-card/40 px-4 py-6 lg:flex lg:flex-col" data-testid="desktop-sidebar">
          <button type="button" className="flex items-center gap-3 px-3 text-left" data-testid="nav-brand-logo">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><Zap className="size-4" /></span>
            <span><span className="block font-heading text-base font-semibold tracking-tight" data-testid="nav-brand-name">pulse</span><span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="nav-brand-caption">ritual studio</span></span>
          </button>
          <div className="mt-12 space-y-1" data-testid="desktop-navigation">
            <p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="desktop-navigation-label">Workspace</p>
            <NavItem icon={<LayoutDashboard className="size-4" />} label="Today" active testId="nav-today" />
            <NavItem icon={<CalendarDays className="size-4" />} label="Calendar" testId="nav-calendar" />
            <NavItem icon={<Activity className="size-4" />} label="Insights" testId="nav-insights" />
          </div>
          <div className="mt-auto rounded-2xl border border-border/70 bg-background/70 p-4" data-testid="sidebar-streak-card">
            <div className="flex items-center justify-between"><span className="flex size-8 items-center justify-center rounded-lg bg-amber-500/12 text-amber-500"><Flame className="size-4" /></span><ArrowUpRight className="size-4 text-muted-foreground" /></div>
            <p className="mt-4 text-sm font-medium" data-testid="sidebar-streak-title">You are in rhythm</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground" data-testid="sidebar-streak-description">12 days of showing up. That is the practice.</p>
          </div>
        </aside>

        <main className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/80 px-4 py-4 backdrop-blur-xl sm:px-8 lg:px-12" data-testid="top-navigation">
            <div className="flex items-center gap-3 lg:hidden"><span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Zap className="size-4" /></span><span className="font-heading font-semibold" data-testid="mobile-brand-name">pulse</span></div>
            <p className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground lg:block" data-testid="top-navigation-context">Tuesday / 24 September 2024</p>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setIsDark((current) => !current)} data-testid="nav-theme-toggle" aria-label="Toggle theme">{isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button>
              <Button variant="outline" size="sm" onClick={() => setIsSimulatorOpen(true)} data-testid="nav-mobile-simulator-toggle" className="hidden gap-2 sm:inline-flex"><Menu className="size-3.5" /> Expo view</Button>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} data-testid="nav-create-ritual-button" className="gap-1.5"><Plus className="size-4" /> <span className="hidden sm:inline">New ritual</span><span className="sm:hidden">New</span></Button>
            </div>
          </header>

          <div className="px-4 py-7 sm:px-8 sm:py-10 lg:px-12">
            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]" data-testid="hero-section">
              <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card px-6 py-7 shadow-[0_30px_80px_-55px_rgba(79,70,229,0.8)] sm:px-8 sm:py-9" data-testid="hero-card">
                <div className="absolute -right-16 -top-20 size-64 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative max-w-xl">
                  <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><span className="font-mono text-[10px] uppercase tracking-[0.2em]" data-testid="hero-kicker">Your daily operating system</span></div>
                  <h1 className="mt-5 max-w-lg font-heading text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl" data-testid="hero-title">Make the day <span className="text-primary">feel lighter.</span></h1>
                  <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground sm:text-base" data-testid="hero-description">A calm space for the small rituals that move your bigger work forward.</p>
                  <div className="mt-7 flex flex-wrap items-center gap-3"><Button onClick={() => setIsCreateOpen(true)} data-testid="hero-create-ritual-button" className="gap-2">Create a ritual <Plus className="size-4" /></Button><button type="button" onClick={() => setIsSimulatorOpen(true)} data-testid="hero-mobile-preview-button" className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-[color,transform] hover:translate-x-0.5 hover:text-foreground">See mobile flow <ChevronRight className="size-4" /></button></div>
                </div>
              </div>
              <Card className="relative overflow-hidden border-0 bg-primary p-6 text-primary-foreground shadow-[0_24px_60px_-38px_rgba(79,70,229,0.95)]" data-testid="focus-summary-card">
                <div className="absolute -bottom-14 -right-12 size-44 rounded-full border-[18px] border-white/10" />
                <div className="relative flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary-foreground/65" data-testid="focus-summary-label">Focus capacity</p><p className="mt-3 font-heading text-5xl font-semibold tracking-tight" data-testid="focus-summary-value">{focusMinutes}<span className="ml-1 text-lg font-normal text-primary-foreground/60">min</span></p></div><span className="flex size-9 items-center justify-center rounded-xl bg-white/15"><TimerReset className="size-4" /></span></div>
                <div className="relative mt-10 border-t border-white/15 pt-4"><div className="flex items-center justify-between text-xs"><span data-testid="focus-summary-subtitle">Across today&apos;s rituals</span><span className="text-primary-foreground/65" data-testid="focus-summary-available">+25 available</span></div><div className="mt-3 h-1.5 rounded-full bg-white/15"><div className="h-full w-[68%] rounded-full bg-emerald-300" /></div></div>
              </Card>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5" data-testid="stats-grid">
              <StatCard label="of rituals complete" value={`${completion}%`} detail="today" icon={<Check className="size-4" />} tone="bg-emerald-500/12 text-emerald-500" testId="stat-completion" />
              <StatCard label="active consistency" value="12 days" detail="best streak" icon={<Flame className="size-4" />} tone="bg-amber-500/12 text-amber-500" testId="stat-streak" />
              <StatCard label="focus time logged" value={`${focusMinutes}m`} detail="this week" icon={<Clock3 className="size-4" />} tone="bg-indigo-500/12 text-indigo-500" testId="stat-focus" />
              <StatCard label="energy index" value="8.4" detail="feeling clear" icon={<Zap className="size-4" />} tone="bg-rose-500/12 text-rose-500" testId="stat-energy" />
            </section>

            <section className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]" data-testid="content-grid">
              <div className="min-w-0" data-testid="rituals-section">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary" data-testid="rituals-kicker">The practice</p><h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight" data-testid="rituals-title">Today&apos;s rituals</h2></div><div className="relative w-full sm:w-48"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rituals" data-testid="ritual-search-input" className="h-9 border-border/70 bg-card pl-9" /></div></div>
                <div className="mt-5 flex gap-1 overflow-x-auto border-b border-border/70 pb-px" data-testid="ritual-filter-tabs">{(Object.keys(categoryLabels) as CategoryFilter[]).map((category) => <button type="button" key={category} onClick={() => setFilter(category)} data-testid={`ritual-filter-${category}`} className={`whitespace-nowrap border-b-2 px-3 pb-3 text-xs font-medium transition-[border-color,color] ${filter === category ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>{categoryLabels[category]}</button>)}</div>
                <div className="mt-4 space-y-3" data-testid="ritual-list">
                  {ritualsQuery.isError && <div className="rounded-2xl border border-amber-500/25 bg-amber-500/8 p-4 text-sm text-amber-700 dark:text-amber-300" data-testid="rituals-api-warning">Connect the backend to load your saved rituals. The page is ready for your flow.</div>}
                  {!ritualsQuery.isError && ritualsQuery.isPending && <div className="space-y-3" data-testid="rituals-loading"><div className="h-24 animate-pulse rounded-2xl bg-muted" /><div className="h-24 animate-pulse rounded-2xl bg-muted" /></div>}
                  <AnimatePresence mode="popLayout">{filteredRituals.map((ritual) => <RitualCard key={ritual.id} ritual={ritual} onToggle={(id) => toggleMutation.mutate(id)} />)}</AnimatePresence>
                  {!ritualsQuery.isPending && filteredRituals.length === 0 && <div className="rounded-2xl border border-dashed border-border p-8 text-center" data-testid="rituals-empty-state"><Circle className="mx-auto size-7 text-muted-foreground/50" /><p className="mt-3 text-sm font-medium" data-testid="rituals-empty-title">No rituals in this view</p><p className="mt-1 text-xs text-muted-foreground" data-testid="rituals-empty-description">Create one small thing to begin.</p></div>}
                </div>
              </div>

              <div className="space-y-5" data-testid="support-widgets">
                <Card className="border-0 bg-card p-5 ring-1 ring-border/70" data-testid="focus-timer-widget"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary" data-testid="focus-timer-kicker">Deep work</p><h3 className="mt-2 font-heading text-lg font-medium" data-testid="focus-timer-title">Focus timer</h3></div><span className="flex size-8 items-center justify-center rounded-lg bg-indigo-500/12 text-indigo-500"><Clock3 className="size-4" /></span></div><div className="my-7 text-center"><p className="font-mono text-5xl font-medium tracking-[-0.06em]" data-testid="focus-timer-value">{formatTime(secondsLeft)}</p><p className="mt-2 text-xs text-muted-foreground" data-testid="focus-timer-status">{timerRunning ? "Focus mode is on" : "Ready when you are"}</p></div><div className="flex gap-2"><Button onClick={() => setTimerRunning((current) => !current)} data-testid="focus-timer-play-button" className="flex-1 gap-2">{timerRunning ? <><span className="size-2 rounded-[2px] bg-current" /> Pause</> : <><Play className="size-3.5 fill-current" /> Start focus</>}</Button><Button variant="outline" size="icon" onClick={() => { setTimerRunning(false); setSecondsLeft(25 * 60); }} data-testid="focus-timer-reset-button" aria-label="Reset focus timer"><RotateCcw className="size-4" /></Button></div><div className="mt-4 flex flex-wrap gap-1.5" data-testid="focus-soundscapes">{["Lo-fi cafe", "Deep rain", "Forest drift"].map((sound) => <button type="button" key={sound} onClick={() => setSoundscape(sound)} data-testid={`focus-soundscape-${sound.toLowerCase().replaceAll(" ", "-")}`} className={`rounded-full px-2.5 py-1 text-[10px] transition-[background-color,color] ${soundscape === sound ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{sound}</button>)}</div></Card>
                <Card className="border-0 bg-card p-5 ring-1 ring-border/70" data-testid="weekly-consistency-widget"><div className="flex items-start justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary" data-testid="weekly-consistency-kicker">Consistency</p><h3 className="mt-2 font-heading text-lg font-medium" data-testid="weekly-consistency-title">A steady week</h3></div><button type="button" aria-label="Open insights" data-testid="weekly-consistency-more" className="rounded-lg p-1.5 text-muted-foreground transition-[background-color,color] hover:bg-muted hover:text-foreground"><ArrowUpRight className="size-4" /></button></div><div className="mt-6 flex h-28 items-end justify-between gap-2" data-testid="weekly-consistency-chart">{[{ day: "M", value: 70 }, { day: "T", value: 92 }, { day: "W", value: 48 }, { day: "T", value: 82 }, { day: "F", value: 62 }, { day: "S", value: 34 }, { day: "S", value: 24 }].map((bar, index) => <div key={`${bar.day}-${index}`} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className={`w-full max-w-6 rounded-t-md transition-[height] ${index === 1 ? "bg-primary" : "bg-primary/15"}`} style={{ height: `${bar.value}%` }} data-testid={`weekly-bar-${index}`} /><span className="font-mono text-[9px] text-muted-foreground" data-testid={`weekly-day-${index}`}>{bar.day}</span></div>)}</div><p className="mt-4 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground" data-testid="weekly-consistency-caption">Your best days start with a ritual before the notifications do.</p></Card>
              </div>
            </section>
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border/70 bg-card/90 px-4 py-3 backdrop-blur-xl lg:hidden" data-testid="mobile-bottom-navigation"><NavItem icon={<LayoutDashboard className="size-4" />} label="Today" active testId="mobile-nav-today" /><NavItem icon={<CalendarDays className="size-4" />} label="Plan" testId="mobile-nav-plan" /><button type="button" onClick={() => setIsCreateOpen(true)} data-testid="mobile-nav-create-button" className="flex size-11 -translate-y-4 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-[transform,box-shadow] hover:-translate-y-5"><Plus className="size-5" /></button><NavItem icon={<Activity className="size-4" />} label="Insights" testId="mobile-nav-insights" /><NavItem icon={<MoreHorizontal className="size-4" />} label="More" testId="mobile-nav-more" /></nav>

      <CreateRitualModal open={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={(payload) => createMutation.mutate(payload)} isSubmitting={createMutation.isPending} />
      {isSimulatorOpen && <MobileSimulator rituals={rituals} onClose={() => setIsSimulatorOpen(false)} onToggle={(id) => toggleMutation.mutate(id)} />}
    </div>
  );
}