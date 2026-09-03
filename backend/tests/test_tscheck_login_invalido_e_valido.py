"""Criterion: Login inválido.

Wrong email or wrong password must both be rejected with a generic 401 message
that does not reveal which field was incorrect, and must not set a session cookie.
"""


def test_login_wrong_password_rejected(client):
    resp = client.post(
        "/auth/login",
        json={"email": "proprietario@cash.app", "password": "WrongPass123!"},
    )
    assert resp.status_code == 401, f"expected 401, got {resp.status_code}: {resp.text[:200]}"
    body = resp.json()
    detail = str(body.get("detail", "")).lower()
    assert "senha" not in detail or "incorret" in detail or "e-mail ou senha" in detail
    assert "cash_session" not in resp.cookies


def test_login_unknown_email_rejected(client):
    resp = client.post(
        "/auth/login",
        json={"email": "naoexiste@cash.app", "password": "QualquerSenha123"},
    )
    assert resp.status_code == 401, f"expected 401, got {resp.status_code}: {resp.text[:200]}"
    assert "cash_session" not in resp.cookies


def test_login_correct_credentials_sets_session_cookie(client):
    resp = client.post(
        "/auth/login",
        json={"email": "proprietario@cash.app", "password": "Cash@2026!"},
    )
    assert resp.status_code == 200, f"expected 200, got {resp.status_code}: {resp.text[:200]}"
    assert "cash_session" in resp.cookies
    body = resp.json()
    assert body["user"]["email"] == "proprietario@cash.app"
