from calendar import month_name
from datetime import date, timedelta
from typing import Any
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status

from lib.auth import require_user
from lib.dates import today_iso
from lib.db import db
from models.finance import (
    AccountsResponse,
    Card,
    CardAccountItem,
    CardDetailsResponse,
    CardSummary,
    Category,
    ExpenseItem,
    FixedAccountItem,
    Goal,
    InsightCategory,
    InsightsResponse,
    MutationResponse,
    PaidAccountItem,
    PaymentResponse,
    PaymentToggle,
    PeriodResponse,
    RecurringAccount,
    RecurringCreate,
    SummaryResponse,
    Transaction,
    TransactionCreate,
    UpcomingItem,
)


router = APIRouter(prefix="/finance", tags=["finance"], dependencies=[Depends(require_user)])

DEFAULT_CATEGORIES = [
    ("cat-salario", "Salário", "entrada", "wallet", "#16803C"),
    ("cat-comissao", "Comissão", "entrada", "trending-up", "#16803C"),
    ("cat-renda-extra", "Renda extra", "entrada", "gift", "#16803C"),
    ("cat-aluguel", "Aluguel", "saida", "home", "#0F766E"),
    ("cat-energia", "Energia", "saida", "zap", "#B25E09"),
    ("cat-internet", "Internet", "saida", "wifi", "#2563EB"),
    ("cat-mercado", "Mercado", "saida", "shopping-cart", "#EA580C"),
    ("cat-restaurantes", "Restaurantes", "saida", "utensils", "#DC2626"),
    ("cat-lazer", "Lazer", "saida", "gamepad-2", "#9333EA"),
    ("cat-compras", "Compras", "saida", "shopping-bag", "#C026D3"),
    ("cat-assinaturas", "Assinaturas", "saida", "refresh-cw", "#DB2777"),
    ("cat-outros", "Outros", "saida", "tag", "#6B7280"),
]


def clean(document: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in document.items() if key != "_id"}


def current_reference() -> str:
    return today_iso()[:7]


def parse_reference(reference: str | None) -> str:
    value = reference or current_reference()
    try:
        date.fromisoformat(f"{value}-01")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail="reference deve estar no formato YYYY-MM") from exc
    return value


def previous_reference(reference: str) -> str:
    first = date.fromisoformat(f"{reference}-01")
    previous = first - timedelta(days=1)
    return previous.strftime("%Y-%m")


def following_reference(reference: str) -> str:
    first = date.fromisoformat(f"{reference}-01")
    following = (first.replace(day=28) + timedelta(days=4)).replace(day=1)
    return following.strftime("%Y-%m")


def month_label(reference: str) -> str:
    year, month = reference.split("-")
    names = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
    ]
    return f"{names[int(month) - 1]} {year}"


def visible_in_month(item: dict[str, Any], reference: str) -> bool:
    start = item.get("start_date")
    if start and start[:7] > reference:
        return False
    count = item.get("installment_count")
    if item.get("type") == "parcela" and count and start:
        start_month = date.fromisoformat(start[:10]).replace(day=1)
        current_month = date.fromisoformat(f"{reference}-01")
        elapsed = (current_month.year - start_month.year) * 12 + current_month.month - start_month.month
        if elapsed >= count:
            return False
    return True


async def ensure_seed() -> None:
    today = today_iso()
    reference = today[:7]
    previous = previous_reference(reference)
    categories_count = await db.finance_categories.count_documents({})
    if categories_count == 0:
        await db.finance_categories.insert_many([
            Category(id=id_, name=name, type=type_, icon=icon, color=color, default=True).model_dump()
            for id_, name, type_, icon, color in DEFAULT_CATEGORIES
        ])

    if await db.finance_cards.count_documents({}) == 0:
        await db.finance_cards.insert_one(Card(
            id="card-nubank", nickname="Nubank", brand="Mastercard", last_four="4821",
            limit=8000, due_day=12, closing_day=3,
        ).model_dump())

    if await db.finance_transactions.count_documents({}) == 0:
        await db.finance_transactions.insert_many([
            Transaction(id="tx-salary", type="entrada", value=5000, category_name="Salário", date=f"{reference}-01", payment_method="pix").model_dump(),
            Transaction(id="tx-internet", type="saida", value=120, category_name="Internet", date=f"{reference}-05", payment_method="debito", card_id="card-nubank", card_nickname="Nubank").model_dump(),
            Transaction(id="tx-market", type="saida", value=187.40, category_name="Mercado", date=f"{reference}-18", payment_method="debito", card_id="card-nubank", card_nickname="Nubank").model_dump(),
            Transaction(id="tx-restaurant", type="saida", value=45.90, category_name="Restaurantes", date=f"{reference}-20", payment_method="credito", card_id="card-nubank", card_nickname="Nubank").model_dump(),
            Transaction(id="tx-previous-market", type="saida", value=850, category_name="Mercado", date=f"{previous}-03", payment_method="debito", card_id="card-nubank", card_nickname="Nubank").model_dump(),
            Transaction(id="tx-previous-leisure", type="saida", value=300, category_name="Lazer", date=f"{previous}-08", payment_method="credito", card_id="card-nubank", card_nickname="Nubank").model_dump(),
        ])

    if await db.finance_recurring.count_documents({}) == 0:
        await db.finance_recurring.insert_many([
            RecurringAccount(id="rec-rent", type="fixa", name="Aluguel", value=1000, due_day=10, category_name="Aluguel", start_date=today).model_dump(),
            RecurringAccount(id="rec-energy", type="fixa", name="Energia", value=180, due_day=15, category_name="Energia", start_date=today).model_dump(),
            RecurringAccount(id="rec-notebook", type="parcela", name="Notebook", value=350, due_day=15, category_name="Compras", card_id="card-nubank", installment_count=10, start_date=today).model_dump(),
            RecurringAccount(id="rec-streaming", type="assinatura", name="Streaming de vídeo", value=45, due_day=12, category_name="Assinaturas", card_id="card-nubank", start_date=today).model_dump(),
        ])

    if await db.finance_goals.count_documents({}) == 0:
        await db.finance_goals.insert_one(Goal(
            id="goal-emergency", name="Reserva de emergência", icon="shield-check", target_value=12000,
            saved_value=3200, monthly_contribution=600,
        ).model_dump())


async def get_recurring(reference: str) -> list[dict[str, Any]]:
    rows = await db.finance_recurring.find({"status": "ativa"}).to_list(1000)
    return [clean(row) for row in rows if visible_in_month(row, reference)]


async def get_payment_ids(reference: str) -> set[str]:
    rows = await db.finance_payments.find({"reference": reference, "paid": True}).to_list(1000)
    return {row["recurring_id"] for row in rows}


@router.get("/period", response_model=PeriodResponse)
async def get_period() -> PeriodResponse:
    reference = current_reference()
    year, month = reference.split("-")
    return PeriodResponse(reference=reference, year=int(year), month=int(month), label=month_label(reference))


@router.get("/categories", response_model=list[Category])
async def get_categories() -> list[Category]:
    await ensure_seed()
    rows = await db.finance_categories.find().sort([("default", -1), ("name", 1)]).to_list(1000)
    return [Category(**clean(row)) for row in rows]


@router.get("/cards", response_model=list[Card])
async def get_cards() -> list[Card]:
    await ensure_seed()
    rows = await db.finance_cards.find().sort("nickname", 1).to_list(1000)
    return [Card(**clean(row)) for row in rows]


def installment_label(item: dict[str, Any], reference: str) -> str | None:
    count = item.get("installment_count")
    start = item.get("start_date")
    if item.get("type") != "parcela" or not count or not start:
        return None
    start_month = date.fromisoformat(start[:10]).replace(day=1)
    current_month = date.fromisoformat(f"{reference}-01")
    number = (current_month.year - start_month.year) * 12 + current_month.month - start_month.month + 1
    return f"{number}/{count}"


async def card_accounts(card_id: str, reference: str) -> list[CardAccountItem]:
    recurring = [row for row in await get_recurring(reference) if row.get("card_id") == card_id]
    paid_ids = await get_payment_ids(reference)
    items = [CardAccountItem(
        id=row["id"], name=row["name"], type=row["type"], value=row["value"],
        due_day=row.get("due_day"), installment_label=installment_label(row, reference),
        paid=row["id"] in paid_ids,
    ) for row in recurring]
    transactions = [clean(row) for row in await db.finance_transactions.find({
        "card_id": card_id,
        "payment_method": "credito",
        "date": {"$regex": f"^{reference}"},
    }).sort("date", -1).to_list(1000)]
    items.extend(CardAccountItem(
        id=row["id"], name=row["category_name"], type="compra", value=row["value"],
        due_day=int(row["date"][8:10]),
    ) for row in transactions)
    return sorted(items, key=lambda item: (item.due_day or 99, item.name))


@router.get("/cards/{card_id}", response_model=CardDetailsResponse)
async def get_card_details(card_id: str, reference: str | None = Query(default=None)) -> CardDetailsResponse:
    await ensure_seed()
    ref = parse_reference(reference)
    card_row = await db.finance_cards.find_one({"id": card_id})
    if not card_row:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    card = Card(**clean(card_row))
    accounts = await card_accounts(card_id, ref)
    next_ref = following_reference(ref)
    next_accounts = await card_accounts(card_id, next_ref)
    current_invoice = sum(item.value for item in accounts)
    next_invoice = sum(item.value for item in next_accounts)
    return CardDetailsResponse(
        reference=ref,
        next_reference=next_ref,
        card=card,
        current_invoice=current_invoice,
        next_invoice=next_invoice,
        available_limit=max(card.limit - current_invoice, 0),
        accounts=accounts,
    )


@router.get("/goals", response_model=list[Goal])
async def get_goals() -> list[Goal]:
    await ensure_seed()
    rows = await db.finance_goals.find().sort("name", 1).to_list(1000)
    return [Goal(**clean(row)) for row in rows]


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(reference: str | None = Query(default=None)) -> SummaryResponse:
    await ensure_seed()
    ref = parse_reference(reference)
    transactions = [clean(row) for row in await db.finance_transactions.find({"date": {"$regex": f"^{ref}"}}).to_list(1000)]
    entered = sum(row["value"] for row in transactions if row["type"] == "entrada")
    spent = sum(row["value"] for row in transactions if row["type"] == "saida")
    recurring = await get_recurring(ref)
    expected = sum(row["value"] for row in recurring)
    paid_ids = await get_payment_ids(ref)
    paid = sum(row["value"] for row in recurring if row["id"] in paid_ids)
    paid_accounts = [PaidAccountItem(
        id=row["id"], name=row["name"], type=row["type"], value=row["value"],
        due_day=row["due_day"], card_id=row.get("card_id"),
    ) for row in sorted(recurring, key=lambda item: item.get("due_day", 0)) if row["id"] in paid_ids]
    goals = [clean(row) for row in await db.finance_goals.find().to_list(1000)]
    total_goals = sum(row["saved_value"] for row in goals)
    monthly_goal_reserve = sum(row["monthly_contribution"] for row in goals)
    available = entered - spent
    free_real = available - expected
    return SummaryResponse(
        reference=ref, saldo_disponivel=available, entrou=entered, gasto=spent,
        previsto=expected, saldo_livre_real=free_real, contas_pagas=paid,
        paid_accounts=paid_accounts,
        total_metas=total_goals, reserva_metas_mensal=monthly_goal_reserve,
        alerta_previsao=max(free_real - 440, 0),
    )


@router.get("/upcoming", response_model=list[UpcomingItem])
async def get_upcoming(reference: str | None = Query(default=None)) -> list[UpcomingItem]:
    await ensure_seed()
    ref = parse_reference(reference)
    rows = sorted(await get_recurring(ref), key=lambda item: item.get("due_day", 0))
    paid_ids = await get_payment_ids(ref)
    return [UpcomingItem(id=row["id"], day=str(row["due_day"]).zfill(2), name=row["name"], type=row["type"], value=-row["value"], paid=row["id"] in paid_ids) for row in rows]


@router.get("/accounts", response_model=AccountsResponse)
async def get_accounts(reference: str | None = Query(default=None)) -> AccountsResponse:
    await ensure_seed()
    ref = parse_reference(reference)
    recurring = await get_recurring(ref)
    paid_ids = await get_payment_ids(ref)
    fixed = [FixedAccountItem(id=row["id"], name=row["name"], value=row["value"], due_day=row["due_day"], category_name=row.get("category_name"), paid=row["id"] in paid_ids) for row in recurring if row["type"] == "fixa"]
    transaction_rows = [clean(row) for row in await db.finance_transactions.find({"type": "saida", "date": {"$regex": f"^{ref}"}, "payment_method": {"$in": ["pix", "debito", "dinheiro", "boleto"]}}).sort("date", -1).to_list(1000)]
    expenses = [ExpenseItem(id=row["id"], name=row["category_name"], value=row["value"], date=row["date"], payment_method=row["payment_method"], card_nickname=row.get("card_nickname")) for row in transaction_rows]
    cards = await get_card_summaries(ref)
    return AccountsResponse(reference=ref, fixed=fixed, expenses=expenses, cards=cards, total_fixed=sum(item.value for item in fixed), total_expenses=sum(item.value for item in expenses), card_total=sum(item.total for item in cards))


async def get_card_summaries(reference: str) -> list[CardSummary]:
    cards = [clean(row) for row in await db.finance_cards.find().sort("nickname", 1).to_list(1000)]
    recurring = await get_recurring(reference)
    return [CardSummary(**card, total=sum(row["value"] for row in recurring if row.get("card_id") == card["id"])) for card in cards]


@router.get("/insights", response_model=InsightsResponse)
async def get_insights(reference: str | None = Query(default=None)) -> InsightsResponse:
    await ensure_seed()
    ref = parse_reference(reference)
    previous = previous_reference(ref)
    current_rows = [clean(row) for row in await db.finance_transactions.find({"type": "saida", "date": {"$regex": f"^{ref}"}}).to_list(1000)]
    previous_rows = [clean(row) for row in await db.finance_transactions.find({"type": "saida", "date": {"$regex": f"^{previous}"}}).to_list(1000)]
    names = {row["category_name"] for row in current_rows + previous_rows}
    categories = [InsightCategory(name=name, current=sum(row["value"] for row in current_rows if row["category_name"] == name), previous=sum(row["value"] for row in previous_rows if row["category_name"] == name), delta=sum(row["value"] for row in current_rows if row["category_name"] == name) - sum(row["value"] for row in previous_rows if row["category_name"] == name)) for name in names]
    categories.sort(key=lambda item: abs(item.delta), reverse=True)
    subscriptions = sum(row["value"] for row in await get_recurring(ref) if row["type"] == "assinatura")
    suggestions = []
    for item in categories[:5]:
        if item.previous > 0 and item.current > item.previous:
            suggestions.append(f"Se reduzir {item.name.lower()} para a média do mês passado, você economiza aproximadamente R$ {item.delta:,.2f}.".replace(",", "X").replace(".", ",").replace("X", "."))
    return InsightsResponse(reference=ref, total_subscriptions=subscriptions, categories=categories[:5], suggestions=suggestions[:3])


@router.post("/transactions", response_model=MutationResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(payload: TransactionCreate) -> MutationResponse:
    await ensure_seed()
    category = await db.finance_categories.find_one({"name": payload.category_name, "type": payload.type})
    if not category:
        category = Category(name=payload.category_name, type=payload.type, default=False).model_dump()
        await db.finance_categories.insert_one(category)

    if payload.type == "saida" and payload.payment_method == "credito":
        if not payload.card_id:
            raise HTTPException(status_code=422, detail="Selecione um cartão para compras no crédito")
        card = await db.finance_cards.find_one({"id": payload.card_id})
        if not card:
            raise HTTPException(status_code=404, detail="Cartão não encontrado")
        recurring_id = str(uuid.uuid4())
        recurring = RecurringAccount(
            id=recurring_id, type="parcela", name=payload.category_name,
            value=round(payload.value / payload.installments, 2), due_day=12,
            category_name=payload.category_name, card_id=payload.card_id,
            installment_count=payload.installments, start_date=payload.date,
        )
        await db.finance_recurring.insert_one(recurring.model_dump())
        return MutationResponse(message="Compra no crédito salva como parcela", recurring_id=recurring_id)

    if payload.type == "saida" and payload.destination == "fixa":
        recurring = RecurringAccount(
            type="fixa", name=payload.category_name, value=payload.value,
            due_day=int(payload.date[8:10]), category_name=payload.category_name,
            start_date=payload.date,
        )
        await db.finance_recurring.insert_one(recurring.model_dump())
        return MutationResponse(message="Conta fixa salva", recurring_id=recurring.id)

    transaction = Transaction(
        type=payload.type, value=payload.value, category_name=payload.category_name,
        date=payload.date, payment_method=payload.payment_method, card_id=payload.card_id,
        card_nickname=(await db.finance_cards.find_one({"id": payload.card_id}) or {}).get("nickname") if payload.card_id else None,
    )
    await db.finance_transactions.insert_one(transaction.model_dump())
    return MutationResponse(message="Movimentação salva", transaction_id=transaction.id)


@router.post("/recurring", response_model=MutationResponse, status_code=status.HTTP_201_CREATED)
async def create_recurring(payload: RecurringCreate) -> MutationResponse:
    await ensure_seed()
    recurring = RecurringAccount(**payload.model_dump())
    await db.finance_recurring.insert_one(recurring.model_dump())
    return MutationResponse(message="Conta recorrente salva", recurring_id=recurring.id)


@router.patch("/payments/{recurring_id}", response_model=PaymentResponse)
async def toggle_payment(recurring_id: str, payload: PaymentToggle) -> PaymentResponse:
    await ensure_seed()
    recurring = await db.finance_recurring.find_one({"id": recurring_id})
    if not recurring:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")
    if payload.paid:
        await db.finance_payments.update_one({"recurring_id": recurring_id, "reference": payload.reference}, {"$set": {"id": str(uuid.uuid4()), "paid": True}}, upsert=True)
    else:
        await db.finance_payments.delete_one({"recurring_id": recurring_id, "reference": payload.reference})
    return PaymentResponse(recurring_id=recurring_id, reference=payload.reference, paid=payload.paid)