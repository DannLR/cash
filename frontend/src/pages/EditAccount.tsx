import { ArrowLeft, CalendarRange, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { FinanceLayoutContext } from "@/components/finance/FinanceShell";
import { deleteRecurringAccount, getRecurringAccount, updateRecurringAccount } from "@/lib/finance";

const typeLabels = { fixa: "Conta fixa", parcela: "Parcela", assinatura: "Assinatura" };

export default function EditAccount() {
  const { accountId = "" } = useParams();
  const { reference } = useOutletContext<FinanceLayoutContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [category, setCategory] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const accountQuery = useQuery({ queryKey: ["finance-recurring", accountId, reference], queryFn: () => getRecurringAccount(accountId, reference), enabled: Boolean(accountId && reference) });

  useEffect(() => {
    if (!accountQuery.data) return;
    setName(accountQuery.data.name);
    setValue(String(accountQuery.data.value).replace(".", ","));
    setDueDay(String(accountQuery.data.due_day));
    setCategory(accountQuery.data.category_name ?? "");
  }, [accountQuery.data]);

  const invalidate = () => queryClient.invalidateQueries({ predicate: (query) => {
    const key = String(query.queryKey[0]);
    return key.startsWith("finance-") && key !== "finance-recurring";
  } });
  const updateMutation = useMutation({
    mutationFn: () => updateRecurringAccount(accountId, { reference, name: name.trim(), value: Number(value.replace(",", ".")), due_day: Number(dueDay), category_name: category.trim() || null }),
    onSuccess: async (result) => { await invalidate(); toast.success(result.message); navigate(`/?month=${reference}`, { replace: true }); },
    onError: () => toast.error("Não foi possível atualizar esta conta."),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteRecurringAccount(accountId, reference),
    onSuccess: async (result) => { await invalidate(); toast.success(result.message); navigate(`/?month=${reference}`, { replace: true }); },
    onError: () => toast.error("Não foi possível excluir esta conta."),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || Number(value.replace(",", ".")) <= 0 || Number(dueDay) < 1 || Number(dueDay) > 31) return;
    updateMutation.mutate();
  };
  const account = accountQuery.data;

  return <div className="mx-auto max-w-3xl space-y-6" data-testid="edit-account-page"><button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary" data-testid="edit-account-back-button"><ArrowLeft className="size-4" /> Voltar</button>{accountQuery.isPending && <Card className="h-80 animate-pulse border-border/70 bg-muted" data-testid="edit-account-loading" />}{accountQuery.isError && <Card className="border-rose-500/30 bg-rose-500/10 p-6 text-rose-700 dark:text-rose-300" data-testid="edit-account-error">Esta conta não está disponível no mês selecionado.</Card>}{account && <><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary" data-testid="edit-account-kicker">{typeLabels[account.type]}</p><h1 className="mt-2 font-heading text-4xl font-semibold tracking-tight" data-testid="edit-account-title">Editar conta</h1><p className="mt-3 text-sm text-muted-foreground" data-testid="edit-account-description">As mudanças serão aplicadas neste mês e nos próximos.</p></div><Card className="border-border/70 bg-card/80 p-6 sm:p-8" data-testid="edit-account-form-card"><div className="mb-6 flex items-start gap-3 rounded-2xl bg-primary/8 p-4 text-sm text-primary" data-testid="edit-account-history-notice"><CalendarRange className="mt-0.5 size-4 shrink-0" /><span data-testid="edit-account-history-text">Meses anteriores continuam com o nome e os valores antigos.</span></div><form onSubmit={submit} className="space-y-5" data-testid="edit-account-form"><label className="block text-xs font-medium text-muted-foreground" data-testid="edit-account-name-label">Nome da conta<Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className="mt-2 h-12 text-foreground" data-testid="edit-account-name-input" /></label><div className="grid gap-5 sm:grid-cols-2"><label className="block text-xs font-medium text-muted-foreground" data-testid="edit-account-value-label">Valor mensal<Input value={value} onChange={(event) => setValue(event.target.value)} inputMode="decimal" required className="mt-2 h-12 text-foreground" data-testid="edit-account-value-input" /></label><label className="block text-xs font-medium text-muted-foreground" data-testid="edit-account-due-label">Dia do vencimento<Input type="number" min={1} max={31} value={dueDay} onChange={(event) => setDueDay(event.target.value)} required className="mt-2 h-12 text-foreground" data-testid="edit-account-due-input" /></label></div><label className="block text-xs font-medium text-muted-foreground" data-testid="edit-account-category-label">Categoria<Input value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 h-12 text-foreground" data-testid="edit-account-category-input" /></label><div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:justify-between"><Button type="button" variant="outline" onClick={() => setConfirmDelete(true)} className="gap-2 border-rose-300 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700" data-testid="edit-account-delete-button"><Trash2 className="size-4" /> Excluir conta</Button><Button type="submit" disabled={updateMutation.isPending} className="gap-2" data-testid="edit-account-save-button"><Save className="size-4" />{updateMutation.isPending ? "Salvando..." : "Salvar alterações"}</Button></div></form></Card></>}{confirmDelete && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="delete-account-dialog"><Card className="w-full max-w-md border-border/70 bg-card p-6 shadow-2xl" data-testid="delete-account-dialog-card"><span className="flex size-11 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600"><Trash2 className="size-5" /></span><h2 className="mt-5 font-heading text-2xl font-semibold" data-testid="delete-account-title">Excluir esta conta?</h2><p className="mt-3 text-sm leading-6 text-muted-foreground" data-testid="delete-account-description">Ela desaparecerá deste mês e dos próximos. Os meses anteriores serão preservados.</p><div className="mt-7 flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setConfirmDelete(false)} data-testid="delete-account-cancel-button">Cancelar</Button><Button type="button" variant="destructive" className="flex-1" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} data-testid="delete-account-confirm-button">{deleteMutation.isPending ? "Excluindo..." : "Excluir"}</Button></div></Card></div>}</div>;
}