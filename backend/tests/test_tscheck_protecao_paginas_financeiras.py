"""Criterion: Proteção das páginas financeiras.

Financial API endpoints must reject requests without a valid session cookie.
"""

import httpx


def test_finance_summary_requires_auth(client):
    resp = client.get("/finance/summary")
    assert resp.status_code == 401, f"expected 401 without cookie, got {resp.status_code}: {resp.text[:200]}"


def test_finance_cards_requires_auth(client):
    resp = client.get("/finance/cards")
    assert resp.status_code == 401, f"expected 401 without cookie, got {resp.status_code}: {resp.text[:200]}"


def test_finance_card_details_requires_auth(client):
    resp = client.get("/finance/cards/card-nubank")
    assert resp.status_code == 401, f"expected 401 without cookie, got {resp.status_code}: {resp.text[:200]}"
