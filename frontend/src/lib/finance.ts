import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";

export type FinanceType = "entrada" | "saida";
export type PaymentMethod = "pix" | "debito" | "dinheiro" | "credito" | "boleto";
export type RecurringType = "fixa" | "parcela" | "assinatura";

export interface PeriodResponse {
  reference: string;
  year: number;
  month: number;
  label: string;
}

export interface Category {
  id: string;
  name: string;
  type: FinanceType;
  icon: string;
  color: string;
  default: boolean;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  target_value: number;
  saved_value: number;
  monthly_contribution: number;
}

export interface Card {
  id: string;
  nickname: string;
  brand: string;
  last_four: string | null;
  limit: number;
  due_day: number | null;
  closing_day: number | null;
}

export interface RecurringAccount {
  id: string;
  type: RecurringType;
  name: string;
  value: number;
  due_day: number;
  status: "ativa" | "inativa";
  category_name: string | null;
  card_id: string | null;
  installment_count: number | null;
  start_date: string | null;
  series_id: string | null;
  end_reference: string | null;
  installment_offset: number;
}

export interface RecurringUpdate {
  reference: string;
  name: string;
  value: number;
  due_day: number;
  category_name: string | null;
}

export interface RecurringUpdateResponse {
  message: string;
  account: RecurringAccount;
}

export interface MonthlyAccountItem {
  id: string;
  name: string;
  type: RecurringType;
  value: number;
  due_day: number;
  card_id: string | null;
  paid: boolean;
}

export interface SummaryResponse {
  reference: string;
  saldo_disponivel: number;
  entrou: number;
  gasto: number;
  previsto: number;
  saldo_livre_real: number;
  contas_pagas: number;
  monthly_accounts: MonthlyAccountItem[];
  total_metas: number;
  reserva_metas_mensal: number;
  alerta_previsao: number;
}

export interface UpcomingItem {
  id: string;
  day: string;
  name: string;
  type: RecurringType;
  value: number;
  paid: boolean;
}

export interface FixedAccountItem {
  id: string;
  name: string;
  value: number;
  due_day: number;
  category_name: string | null;
  paid: boolean;
}

export interface ExpenseItem {
  id: string;
  name: string;
  value: number;
  date: string;
  payment_method: PaymentMethod;
  card_nickname: string | null;
}

export interface CardSummary extends Card {
  total: number;
}

export interface CardAccountItem {
  id: string;
  name: string;
  type: "compra" | "parcela" | "assinatura";
  value: number;
  due_day: number | null;
  installment_label: string | null;
  paid: boolean;
}

export interface CardDetailsResponse {
  reference: string;
  next_reference: string;
  card: Card;
  current_invoice: number;
  next_invoice: number;
  available_limit: number;
  accounts: CardAccountItem[];
}

export interface AccountsResponse {
  reference: string;
  fixed: FixedAccountItem[];
  expenses: ExpenseItem[];
  cards: CardSummary[];
  total_fixed: number;
  total_expenses: number;
  card_total: number;
}

export interface InsightCategory {
  name: string;
  current: number;
  previous: number;
  delta: number;
}

export interface InsightsResponse {
  reference: string;
  total_subscriptions: number;
  categories: InsightCategory[];
  suggestions: string[];
}

export interface TransactionCreate {
  type: FinanceType;
  value: number;
  category_name: string;
  date: string;
  payment_method: PaymentMethod;
  card_id?: string | null;
  destination?: "gasto" | "fixa";
  installments?: number;
}

export interface MutationResponse {
  message: string;
  transaction_id: string | null;
  recurring_id: string | null;
}

export interface PaymentResponse {
  recurring_id: string;
  reference: string;
  paid: boolean;
}

export function formatBRL(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
}

export function buildReferencePath(path: string, reference: string) {
  return `${path}${path.includes("?") ? "&" : "?"}reference=${encodeURIComponent(reference)}`;
}

export const getPeriod = () => apiGet<PeriodResponse>("/finance/period");
export const getSummary = (reference: string) => apiGet<SummaryResponse>(buildReferencePath("/finance/summary", reference));
export const getUpcoming = (reference: string) => apiGet<UpcomingItem[]>(buildReferencePath("/finance/upcoming", reference));
export const getAccounts = (reference: string) => apiGet<AccountsResponse>(buildReferencePath("/finance/accounts", reference));
export const getInsights = (reference: string) => apiGet<InsightsResponse>(buildReferencePath("/finance/insights", reference));
export const getCategories = () => apiGet<Category[]>("/finance/categories");
export const getCards = () => apiGet<Card[]>("/finance/cards");
export const getCardDetails = (id: string, reference: string) => apiGet<CardDetailsResponse>(buildReferencePath(`/finance/cards/${id}`, reference));
export const getGoals = () => apiGet<Goal[]>("/finance/goals");
export const getRecurringAccount = (id: string, reference: string) => apiGet<RecurringAccount>(buildReferencePath(`/finance/recurring/${id}`, reference));
export const updateRecurringAccount = (id: string, payload: RecurringUpdate) => apiPatch<RecurringUpdateResponse>(`/finance/recurring/${id}`, payload);
export const deleteRecurringAccount = (id: string, reference: string) => apiDelete<MutationResponse>(buildReferencePath(`/finance/recurring/${id}`, reference));
export const createTransaction = (payload: TransactionCreate) => apiPost<MutationResponse>("/finance/transactions", payload);
export const togglePayment = (id: string, reference: string, paid: boolean) => apiPatch<PaymentResponse>(`/finance/payments/${id}`, { reference, paid });