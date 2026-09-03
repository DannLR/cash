import { CreditCard, Landmark, ReceiptText, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTransaction, getCards, getCategories } from "@/lib/finance";
import type { Card, Category, FinanceType, PaymentMethod, TransactionCreate } from "@/lib/finance";

const methods: { value: PaymentMethod; label: string; icon: typeof Wallet }[] = [
  { value: "pix", label: "Pix", icon: Wallet },
  { value: "debito", label: "Débito", icon: CreditCard },
  { value: "dinheiro", label: "Dinheiro", icon: Landmark },
  { value: "credito", label: "Crédito", icon: CreditCard },
  { value: "boleto", label: "Boleto", icon: ReceiptText },
];

interface AddTransactionDialogProps { open: boolean; onClose: () => void }

function parseMoney(value: string) {
  return Number(value.replace(/\./g, "").replace(",", ".")) || 0;
}

function maskMoney(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return (Number(digits) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AddTransactionDialog({ open, onClose }: AddTransactionDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [type, setType] = useState<FinanceType>("saida");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [cardId, setCardId] = useState("");
  const [installments, setInstallments] = useState("1");
  const [destination, setDestination] = useState<"gasto" | "fixa">("gasto");
  const categoriesQuery = useQuery({ queryKey: ["finance-categories"], queryFn: getCategories, enabled: open });
  const cardsQuery = useQuery({ queryKey: ["finance-cards"], queryFn: getCards, enabled: open });
  const categories = categoriesQuery.data ?? [];
  const filteredCategories = useMemo(() => categories.filter((item) => item.type === type), [categories, type]);
  const cards = cardsQuery.data ?? [];
  const mutation = useMutation({
    mutationFn: (payload: TransactionCreate) => createTransaction(payload),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ predicate: (query) => String(query.queryKey[0]).startsWith("finance-") });
      toast.success(result.message);
      onClose();
    },
    onError: () => toast.error("Não foi possível salvar. Confira os dados e tente novamente."),
  });

  useEffect(() => {
    if (!open) return;
    setStep(1); setType("saida"); setAmount(""); setCategory(""); setPaymentMethod(""); setDate(new Date().toISOString().slice(0, 10)); setCardId(""); setInstallments("1"); setDestination("gasto");
  }, [open]);

  useEffect(() => {
    if (filteredCategories.length && !filteredCategories.some((item) => item.name === category)) setCategory(filteredCategories[0].name);
  }, [category, filteredCategories]);

  if (!open) return null;
  const canContinue = step === 1 ? parseMoney(amount) > 0 : step === 2 ? Boolean(category) : Boolean(paymentMethod && date && (paymentMethod !== "credito" || cardId));
  const submit = () => mutation.mutate({ type, value: parseMoney(amount), category_name: category, date, payment_method: paymentMethod as PaymentMethod, card_id: cardId || null, destination, installments: Number(installments) || 1 });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-md sm:items-center sm:p-6" role="dialog" aria-modal="true" data-testid="add-transaction-dialog">
      <div className="w-full max-w-xl rounded-t-[2rem] border border-border/70 bg-card p-6 shadow-2xl sm:rounded-[2rem] sm:p-8" data-testid="add-transaction-dialog-card">
        <div className="flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary" data-testid="add-transaction-kicker">Novo lançamento</p><h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight" data-testid="add-transaction-title">Dê um destino ao seu dinheiro</h2></div><button type="button" onClick={onClose} aria-label="Fechar lançamento" className="rounded-full p-2 text-muted-foreground transition-[background-color,transform,color] hover:rotate-90 hover:bg-muted hover:text-foreground" data-testid="add-transaction-close-button"><X className="size-5" /></button></div>
        <div className="mt-6 flex gap-1.5" data-testid="add-transaction-progress">{[1, 2, 3].map((item) => <span key={item} className={`h-1 flex-1 rounded-full ${item <= step ? "bg-primary" : "bg-border"}`} data-testid={`add-transaction-progress-${item}`} />)}</div>
        <div className="mt-7 min-h-[260px]">
          {step === 1 && <div data-testid="add-transaction-step-amount"><p className="text-sm font-medium" data-testid="add-transaction-amount-label">Quanto foi?</p><div className="mt-5 flex items-center gap-3 border-b border-border pb-3"><span className="text-lg text-muted-foreground" data-testid="add-transaction-currency">R$</span><Input autoFocus value={amount} onChange={(event) => setAmount(maskMoney(event.target.value))} inputMode="decimal" placeholder="0,00" className="h-auto border-0 bg-transparent p-0 font-mono text-4xl font-semibold shadow-none focus-visible:ring-0" data-testid="add-transaction-amount-input" /></div><div className="mt-7 flex gap-2" data-testid="add-transaction-type-options"><button type="button" onClick={() => setType("saida")} className={`flex-1 rounded-xl border p-3 text-sm transition-[background-color,border-color,color] ${type === "saida" ? "border-rose-500 bg-rose-500/10 text-rose-600" : "border-border text-muted-foreground hover:border-rose-300"}`} data-testid="add-transaction-expense-type">Gasto</button><button type="button" onClick={() => setType("entrada")} className={`flex-1 rounded-xl border p-3 text-sm transition-[background-color,border-color,color] ${type === "entrada" ? "border-emerald-500 bg-emerald-500/10 text-emerald-600" : "border-border text-muted-foreground hover:border-emerald-300"}`} data-testid="add-transaction-income-type">Entrada</button></div></div>}
          {step === 2 && <div data-testid="add-transaction-step-category"><p className="text-sm font-medium" data-testid="add-transaction-category-label">Escolha uma categoria</p><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3" data-testid="add-transaction-category-grid">{filteredCategories.map((item: Category) => <button type="button" key={item.id} onClick={() => setCategory(item.name)} className={`rounded-xl border px-3 py-3 text-left text-sm transition-[background-color,border-color,transform] hover:-translate-y-0.5 ${category === item.name ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/50 hover:border-primary/50"}`} data-testid={`transaction-category-${item.name.toLowerCase().replaceAll(" ", "-")}`}><span className="mb-2 block size-2 rounded-full" style={{ backgroundColor: category === item.name ? "currentColor" : item.color }} /><span data-testid={`transaction-category-label-${item.id}`}>{item.name}</span></button>)}</div></div>}
          {step === 3 && <div data-testid="add-transaction-step-details"><p className="text-sm font-medium" data-testid="add-transaction-details-label">Data e forma de pagamento</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-xs text-muted-foreground" data-testid="add-transaction-date-field">Data<Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-2 h-11 text-sm text-foreground" data-testid="add-transaction-date-input" /></label><label className="text-xs text-muted-foreground" data-testid="add-transaction-payment-field">Pagamento<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)} className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" data-testid="add-transaction-payment-select"><option value="">Selecione</option>{methods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label></div>{paymentMethod && <div className="mt-5 rounded-2xl border border-border/70 bg-background/60 p-4" data-testid="add-transaction-details-panel">{paymentMethod === "credito" ? <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground" data-testid="add-transaction-card-field">Cartão<select value={cardId} onChange={(event) => setCardId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground" data-testid="add-transaction-card-select"><option value="">Selecione</option>{cards.map((card: Card) => <option key={card.id} value={card.id}>{card.nickname} •••• {card.last_four}</option>)}</select></label><label className="text-xs text-muted-foreground" data-testid="add-transaction-installments-field">Parcelas<Input type="number" min={1} max={24} value={installments} onChange={(event) => setInstallments(event.target.value)} className="mt-2 h-10 text-sm text-foreground" data-testid="add-transaction-installments-input" /></label></div> : type === "saida" && <div><p className="text-xs text-muted-foreground" data-testid="add-transaction-destination-label">Adicionar como</p><div className="mt-2 flex gap-2"><button type="button" onClick={() => setDestination("gasto")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${destination === "gasto" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`} data-testid="add-transaction-destination-expense">Gasto avulso</button><button type="button" onClick={() => setDestination("fixa")} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${destination === "fixa" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`} data-testid="add-transaction-destination-fixed">Conta fixa</button></div></div>}</div>}</div>}
        </div>
        <div className="flex gap-2 border-t border-border/70 pt-5"><Button type="button" variant="outline" className="flex-1" onClick={() => step === 1 ? onClose() : setStep((current) => current - 1)} data-testid="add-transaction-back-button">{step === 1 ? "Cancelar" : "Voltar"}</Button><Button type="button" className="flex-[1.5]" disabled={!canContinue || mutation.isPending} onClick={() => step < 3 ? setStep((current) => current + 1) : submit()} data-testid="add-transaction-continue-button">{mutation.isPending ? "Salvando..." : step === 3 ? "Salvar lançamento" : "Continuar"}</Button></div>
      </div>
    </div>
  );
}