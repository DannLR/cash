"""Criterion: Contas e pagamento mensal - toggling a fixed account's paid status
via PATCH /finance/payments/{id} is reflected for the selected month."""

import pytest


def test_toggle_payment_marks_and_unmarks_fixed_account(auth_client):
    client = auth_client
    period = client.get("/finance/period")
    assert period.status_code == 200, period.text
    reference = period.json()["reference"]

    accounts = client.get("/finance/accounts", params={"reference": reference})
    assert accounts.status_code == 200, accounts.text
    fixed = accounts.json()["fixed"]
    assert len(fixed) > 0, "expected seeded fixed accounts (Aluguel/Energia)"
    target = fixed[0]
    recurring_id = target["id"]
    original_paid = target["paid"]

    toggled = client.patch(
        f"/finance/payments/{recurring_id}",
        json={"reference": reference, "paid": not original_paid},
    )
    assert toggled.status_code == 200, toggled.text

    after = client.get("/finance/accounts", params={"reference": reference})
    assert after.status_code == 200, after.text
    updated = next(a for a in after.json()["fixed"] if a["id"] == recurring_id)
    assert updated["paid"] == (not original_paid)

    # restore original state so the seeded fixture is left as found
    restore = client.patch(
        f"/finance/payments/{recurring_id}",
        json={"reference": reference, "paid": original_paid},
    )
    assert restore.status_code == 200, restore.text

    restored = client.get("/finance/accounts", params={"reference": reference})
    restored_entry = next(a for a in restored.json()["fixed"] if a["id"] == recurring_id)
    assert restored_entry["paid"] == original_paid


def test_toggle_payment_rejects_unknown_recurring_id(auth_client):
    client = auth_client
    resp = client.patch(
        "/finance/payments/tscheck-unknown-recurring-id",
        json={"reference": "2026-09", "paid": True},
    )
    assert resp.status_code in (404, 422), resp.text
