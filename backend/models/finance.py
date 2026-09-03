from datetime import date
from typing import Literal
import uuid

from pydantic import BaseModel, Field

from lib.dates import today_iso


FinanceType = Literal["entrada", "saida"]
RecurringType = Literal["fixa", "parcela", "assinatura"]
PaymentMethod = Literal["pix", "debito", "dinheiro", "credito", "boleto"]


class PeriodResponse(BaseModel):
    reference: str
    year: int
    month: int
    label: str


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: FinanceType
    icon: str = "tag"
    color: str = "#0F766E"
    default: bool = False


class Goal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    icon: str = "flag"
    target_value: float
    saved_value: float = 0
    monthly_contribution: float = 0


class Card(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nickname: str
    brand: str
    last_four: str | None = None
    limit: float = 0
    due_day: int | None = None
    closing_day: int | None = None


class Transaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: FinanceType
    value: float
    category_name: str
    date: str
    payment_method: PaymentMethod
    card_id: str | None = None
    card_nickname: str | None = None


class RecurringAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: RecurringType
    name: str
    value: float
    due_day: int
    status: Literal["ativa", "inativa"] = "ativa"
    category_name: str | None = None
    card_id: str | None = None
    installment_count: int | None = None
    start_date: str | None = None


class SummaryResponse(BaseModel):
    reference: str
    saldo_disponivel: float
    entrou: float
    gasto: float
    previsto: float
    saldo_livre_real: float
    contas_pagas: float
    total_metas: float
    reserva_metas_mensal: float
    alerta_previsao: float


class UpcomingItem(BaseModel):
    id: str
    day: str
    name: str
    type: RecurringType
    value: float


class FixedAccountItem(BaseModel):
    id: str
    name: str
    value: float
    due_day: int
    category_name: str | None = None
    paid: bool = False


class ExpenseItem(BaseModel):
    id: str
    name: str
    value: float
    date: str
    payment_method: PaymentMethod
    card_nickname: str | None = None


class CardSummary(Card):
    total: float = 0


class AccountsResponse(BaseModel):
    reference: str
    fixed: list[FixedAccountItem]
    expenses: list[ExpenseItem]
    cards: list[CardSummary]
    total_fixed: float
    total_expenses: float
    card_total: float


class InsightCategory(BaseModel):
    name: str
    current: float
    previous: float
    delta: float


class InsightsResponse(BaseModel):
    reference: str
    total_subscriptions: float
    categories: list[InsightCategory]
    suggestions: list[str]


class TransactionCreate(BaseModel):
    type: FinanceType = "saida"
    value: float = Field(gt=0)
    category_name: str = Field(min_length=1)
    date: str = Field(default_factory=today_iso)
    payment_method: PaymentMethod = "pix"
    card_id: str | None = None
    destination: Literal["gasto", "fixa"] = "gasto"
    installments: int = Field(default=1, ge=1, le=24)


class RecurringCreate(BaseModel):
    type: RecurringType
    name: str = Field(min_length=1)
    value: float = Field(gt=0)
    due_day: int = Field(ge=1, le=31)
    category_name: str | None = None
    card_id: str | None = None
    installment_count: int | None = Field(default=None, ge=1, le=24)
    start_date: str | None = None


class MutationResponse(BaseModel):
    message: str
    transaction_id: str | None = None
    recurring_id: str | None = None


class PaymentToggle(BaseModel):
    reference: str
    paid: bool


class PaymentResponse(BaseModel):
    recurring_id: str
    reference: str
    paid: bool