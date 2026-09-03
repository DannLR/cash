"""Criterion: Dashboard financeiro mensal - summary endpoint returns all figures."""

import pytest


def test_summary_has_all_dashboard_fields(auth_client):
    client = auth_client
    period = client.get("/finance/period")
    assert period.status_code == 200, period.text
    reference = period.json()["reference"]

    resp = client.get("/finance/summary", params={"reference": reference})
    assert resp.status_code == 200, resp.text
    data = resp.json()

    for field in (
        "saldo_livre_real",
        "saldo_disponivel",
        "entrou",
        "gasto",
        "previsto",
        "reserva_metas_mensal",
    ):
        assert field in data, f"missing field {field} in {data}"
        assert isinstance(data[field], (int, float))

    assert data["reference"] == reference


def test_summary_rejects_unknown_reference_gracefully(auth_client):
    # An invalid reference should not 500 the server.
    resp = auth_client.get("/finance/summary", params={"reference": "not-a-month"})
    assert resp.status_code in (200, 400, 404, 422), resp.text
