import { BarChart3, CalendarClock, CreditCard, LayoutDashboard, LogOut, Moon, Plus, Receipt, Sun, Target, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import AddTransactionDialog from "@/components/finance/AddTransactionDialog";
import MonthPicker from "@/components/finance/MonthPicker";
import Onboarding from "@/components/finance/Onboarding";
import { getPeriod } from "@/lib/finance";
import { getCurrentUser, logout } from "@/lib/auth";

export interface FinanceLayoutContext {
  reference: string;
  openTransaction: () => void;
}

const navItems = [
  { to: "/", label: "Início", icon: LayoutDashboard, testId: "nav-home" },
  { to: "/planejamento", label: "Planejamento", icon: CalendarClock, testId: "nav-planning" },
  { to: "/contas", label: "Contas", icon: Receipt, testId: "nav-accounts" },
  { to: "/cartoes", label: "Cartões", icon: CreditCard, testId: "nav-cards" },
  { to: "/insights", label: "Insights", icon: BarChart3, testId: "nav-insights" },
];

function navClass(active: boolean) {
  return `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] hover:translate-x-0.5 ${active ? "bg-primary text-primary-foreground shadow-[0_12px_28px_-16px_var(--primary)]" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`;
}

export default function FinanceShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userQuery = useQuery({ queryKey: ["auth-me"], queryFn: getCurrentUser, staleTime: 60_000 });
  const periodQuery = useQuery({ queryKey: ["finance-period"], queryFn: getPeriod, staleTime: 300_000 });
  const reference = searchParams.get("month") ?? periodQuery.data?.reference ?? "";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(() => localStorage.getItem("cash-onboarding-seen") !== "true");
  const [dark, setDark] = useState(() => localStorage.getItem("cash-theme") === "dark");
  const logoutMutation = useMutation({ mutationFn: logout, onSuccess: () => { queryClient.clear(); navigate("/login", { replace: true }); } });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("cash-theme", dark ? "dark" : "light");
  }, [dark]);

  const changeReference = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set("month", next); else params.delete("month");
    setSearchParams(params);
  };
  const finishOnboarding = () => { localStorage.setItem("cash-onboarding-seen", "true"); setOnboardingOpen(false); };
  const context: FinanceLayoutContext = { reference, openTransaction: () => setDialogOpen(true) };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="cash-app">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(20,184,166,0.12),transparent_32rem)]" />
      <div className="relative grid min-h-screen lg:grid-cols-[256px_1fr]">
        <aside className="hidden border-r border-border/70 bg-card/55 px-4 py-6 backdrop-blur-xl lg:flex lg:flex-col" data-testid="desktop-sidebar">
          <button type="button" onClick={() => navigate("/")} className="flex items-center gap-3 px-3 text-left" data-testid="app-brand-logo"><span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><WalletCards className="size-5" /></span><span><span className="block font-heading text-lg font-semibold tracking-tight" data-testid="app-brand-name">cash</span><span className="block font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="app-brand-caption">finance command</span></span></button>
          <div className="mt-12 space-y-1" data-testid="desktop-navigation"><p className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="desktop-navigation-label">Seu dinheiro</p>{navItems.map((item) => { const Icon = item.icon; return <NavLink key={item.to} to={item.to} className={({ isActive }) => navClass(isActive)} end={item.to === "/"} data-testid={item.testId}><Icon className="size-4" /><span data-testid={`${item.testId}-label`}>{item.label}</span></NavLink>; })}</div>
          <div className="mt-auto rounded-2xl border border-border/70 bg-background/70 p-4" data-testid="sidebar-goal-card"><div className="flex items-center justify-between"><span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><Target className="size-4" /></span><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" data-testid="sidebar-goal-kicker">Foco</span></div><p className="mt-4 text-sm font-medium" data-testid="sidebar-goal-title">Um mês de cada vez</p><p className="mt-1 text-xs leading-5 text-muted-foreground" data-testid="sidebar-goal-description">Seu dinheiro fica mais claro quando o próximo passo também fica.</p></div><div className="mt-3 flex items-center justify-between gap-2 rounded-xl px-3 py-2" data-testid="sidebar-user"><div className="min-w-0"><p className="truncate text-xs font-medium" data-testid="sidebar-user-name">{userQuery.data?.name ?? "Proprietário"}</p><p className="truncate text-[10px] text-muted-foreground" data-testid="sidebar-user-email">{userQuery.data?.email ?? ""}</p></div><button type="button" onClick={() => logoutMutation.mutate()} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Sair" data-testid="sidebar-logout-button"><LogOut className="size-4" /></button></div>
        </aside>
        <main className="min-w-0 pb-24 lg:pb-0">
          <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-xl sm:px-8 lg:px-10" data-testid="top-navigation"><div className="flex items-center gap-3 lg:hidden"><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><WalletCards className="size-4" /></span><span className="font-heading font-semibold" data-testid="mobile-brand-name">cash</span></div><div className="hidden lg:block"><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground" data-testid="top-navigation-context">Visão financeira mensal</p></div><div className="ml-auto flex items-center gap-2"><MonthPicker reference={reference} onChange={changeReference} /><Button type="button" variant="ghost" size="icon" onClick={() => setDark((value) => !value)} aria-label="Alternar tema" data-testid="theme-toggle-button">{dark ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button><Button type="button" size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5" data-testid="header-add-transaction-button"><Plus className="size-4" /><span className="hidden sm:inline">Novo lançamento</span><span className="sm:hidden">Novo</span></Button><Button type="button" variant="ghost" size="icon" className="lg:hidden" onClick={() => logoutMutation.mutate()} aria-label="Sair" data-testid="mobile-logout-button"><LogOut className="size-4" /></Button></div></header>
          <div className="px-4 py-7 sm:px-8 sm:py-10 lg:px-10"><Outlet context={context} /></div>
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border/70 bg-card/90 px-2 py-3 backdrop-blur-xl lg:hidden" data-testid="bottom-nav-dock">{navItems.map((item) => { const Icon = item.icon; const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to); return <NavLink key={item.to} to={item.to} end={item.to === "/"} className={`flex min-w-16 flex-col items-center gap-1 rounded-xl px-2 py-1 text-[10px] font-medium ${active ? "text-primary" : "text-muted-foreground"}`} data-testid={`mobile-${item.testId}`}><Icon className="size-4" /><span data-testid={`mobile-${item.testId}-label`}>{item.label}</span></NavLink>; })}<button type="button" onClick={() => setDialogOpen(true)} className="-translate-y-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-[transform,box-shadow] hover:-translate-y-5" aria-label="Novo lançamento" data-testid="mobile-add-transaction-button"><Plus className="size-5" /></button></nav>
      <AddTransactionDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      {onboardingOpen && <Onboarding onFinish={finishOnboarding} />}
    </div>
  );
}