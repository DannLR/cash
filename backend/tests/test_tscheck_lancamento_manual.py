"""Criterion: Lancamento manual ponta a ponta - creating a manual transaction via API
updates the month totals (gasto) for the reference month it belongs to."""

import uuid

import pytest


def test_create_transaction_updates_month_totals(client):
    period = client.get("/finance/period")
    assert period.status_code == 200, period.text
    reference = period.json()["reference"]
    year, month = period.json()["year"], period.json()["month"]
    date_str = f"{year:04d}-{month:02d}-20"

    before = client.get("/finance/summary", params={"reference": reference})
    assert before.status_code == 200, before.text
    gasto_before = before.json()["gasto"]

    unique_value = 137.77
    payload = {
        "type": "saida",
        "value": unique_value,
        "category_name": "Mercado",
        "date": date_str,
        "payment_method": "pix",
        "destination": "gasto",
    }
    created = client.post("/finance/transactions", json=payload)
    assert created.status_code == 201, created.text
    body = created.json()
    assert "id" in body or "message" in body

    after = client.get("/finance/summary", params={"reference": reference})
    assert after.status_code == 200, after.text
    gasto_after = after.json()["gasto"]

    assert round(gasto_after - gasto_before, 2) == round(unique_value, 2), (
        gasto_before,
        gasto_after,
    )

    accounts = client.get("/finance/accounts", params={"reference": reference})
    assert accounts.status_code == 200, accounts.text
    names = [e["value"] for e in accounts.json()["expenses"]]
    assert any(abs(v - unique_value) < 0.001 for v in names), names


def test_create_transaction_rejects_invalid_value(client):
    payload = {
        "type": "saida",
        "value": -10,  # exclusiveMinimum 0 -> should be rejected
        "category_name": "Mercado",
        "date": "2026-09-20",
        "payment_method": "pix",
    }
    resp = client.post("/finance/transactions", json=payload)
    assert resp.status_code == 422, resp.text
