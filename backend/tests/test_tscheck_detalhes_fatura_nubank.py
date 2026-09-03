"""Criterion: Detalhes da fatura Nubank.

After authenticating, GET /api/finance/cards/card-nubank must return the seeded
Nubank card facts: last four 4821, limit, closing/due day, current/next invoice,
and linked accounts including Notebook and Streaming de vídeo.
"""


def test_card_nubank_details_include_seeded_accounts(client):
    login = client.post(
        "/auth/login",
        json={"email": "proprietario@cash.app", "password": "Cash@2026!"},
    )
    assert login.status_code == 200, f"login failed: {login.status_code} {login.text[:200]}"

    resp = client.get("/finance/cards/card-nubank")
    assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text[:200]}"
    data = resp.json()

    card = data["card"]
    assert card["last_four"] == "4821"
    assert card["limit"] == 8000.0
    assert card["closing_day"] == 3
    assert card["due_day"] == 12
    assert "current_invoice" in data
    assert "next_invoice" in data

    names = [item["name"] for item in data["accounts"]]
    assert "Notebook" in names, f"Notebook missing from accounts: {names}"
    assert "Streaming de vídeo" in names, f"Streaming missing from accounts: {names}"


def test_card_details_unknown_card_not_found(client):
    login = client.post(
        "/auth/login",
        json={"email": "proprietario@cash.app", "password": "Cash@2026!"},
    )
    assert login.status_code == 200

    resp = client.get("/finance/cards/card-does-not-exist")
    assert resp.status_code in (404, 422), f"expected 404/422, got {resp.status_code}: {resp.text[:200]}"
