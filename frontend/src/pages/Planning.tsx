import { ArrowDownRight, CalendarClock, Check, CircleAlert } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import type { FinanceLayoutContext } from "@/components/finance/FinanceShell";
import { formatBRL, getSummary, getUpcoming, togglePayment } from "@/lib/finance";

export default function Planning() {
  const { reference } = useOutletContext<FinanceLayoutContext>();
  const queryClient = useQueryClient();
  const upcomingQuery = useQuery({ queryKey: ["finance-upcoming", reference], queryFn: () => getUpcoming(reference), enabled: Boolean(reference) });
  const summaryQuery = useQuery({ queryKey: ["finance-summary", reference], queryFn: () => getSummary(reference), enabled: Boolean(reference) });
  const paymentMutation = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => togglePayment(id, reference, paid),
    onSuccess: () => {
      void queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("finance-") });
      toast.success("Pagamento do mês atualizado");
    },
  });
  const upcoming = upcomingQuery.data ?? [];
  const total = upcoming.reduce((sum, item) => sum + Math.abs(item.value), 0);
  return <div className="space-y-7" data-testid="planning-page">
    <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary" data-testid="planning-kicker">O que vem pela frente</p><h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight" data-testid="planning-title">Planejamento</h1><p className="mt-3 text-sm text-muted-foreground" data-testid="planning-description">Antecipe os compromissos que já têm lugar no seu mês.</p></div>
    <section className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <Card className="border-border/70 bg-card/80 p-6" data-testid="planning-total-card"><CalendarClock className="size-5 text-primary" /><p className="mt-5 text-sm text-muted-foreground" data-testid="planning-total-label">Total dos próximos lançamentos</p><p className="mt-2 font-heading text-3xl font-semibold" data-testid="planning-total-value">{formatBRL(total)}</p>{summaryQuery.data && <div className="mt-6 flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-xs leading-5 text-amber-700 dark:text-amber-300"><CircleAlert className="mt-0.5 size-4 shrink-0" /><span data-testid="planning-alert">Considerando o que ainda falta pagar, seu saldo mínimo previsto fica em torno de {formatBRL(summaryQuery.data.saldo_livre_real)}.</span></div>}</Card>
      <Card className="border-border/70 bg-card/80 p-6" data-testid="planning-list-card"><div className="flex items-center justify-between"><h2 className="font-heading text-xl font-semibold" data-testid="planning-list-title">Próximos lançamentos</h2><span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground" data-testid="planning-list-count">{upcoming.length} itens</span></div><div className="mt-5 divide-y divide-border/70">{upcomingQuery.isPending && <p className="py-6 text-sm text-muted-foreground" data-testid="planning-loading">Carregando lançamentos...</p>}{!upcomingQuery.isPending && upcoming.length === 0 && <p className="py-6 text-sm text-muted-foreground" data-testid="planning-empty">Nenhuma conta recorrente cadastrada ainda.</p>}{upcoming.map((item) => <div key={item.id} className={`flex items-center justify-between gap-4 py-4 ${item.paid ? "opacity-70" : ""}`} data-testid={`planning-item-${item.id}`}><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-muted font-mono text-xs font-semibold" data-testid={`planning-day-${item.id}`}>{item.day}</span><div><p className={`text-sm font-medium ${item.paid ? "line-through" : ""}`} data-testid={`planning-name-${item.id}`}>{item.name}</p><p className="mt-1 text-xs capitalize text-muted-foreground" data-testid={`planning-type-${item.id}`}>{item.type}</p></div></div><div className="flex items-center gap-3"><span className="flex items-center gap-1 text-sm font-medium" data-testid={`planning-value-${item.id}`}><ArrowDownRight className="size-3 text-muted-foreground" />{formatBRL(Math.abs(item.value))}</span><button type="button" onClick={() => paymentMutation.mutate({ id: item.id, paid: !item.paid })} className={`flex size-8 items-center justify-center rounded-lg border transition-[background-color,border-color,color] ${item.paid ? "border-emerald-600 bg-emerald-600 text-white" : "border-border text-transparent hover:border-primary"}`} aria-label={item.paid ? `Desmarcar ${item.name} como paga` : `Marcar ${item.name} como paga`} data-testid={`planning-payment-${item.id}`}><Check className="size-4" /></button></div></div>)}</div></Card>
    </section>
  </div>;
}