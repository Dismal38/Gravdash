"""Tests for GRAV-SHIFT admin endpoints (Bearer-token protected).
Run alongside the main test suite.
"""
import os
import requests
import pytest
from pathlib import Path


def _read_env_var(name: str, env_file: Path) -> str:
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith(f"{name}="):
                return line.split("=", 1)[1].strip().strip('"')
    return ""


BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    BASE_URL = _read_env_var("REACT_APP_BACKEND_URL", Path("/app/frontend/.env")).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_TOKEN = _read_env_var("ADMIN_TOKEN", Path("/app/backend/.env"))


@pytest.fixture(scope="module")
def client():
    return requests.Session()


@pytest.fixture
def admin_headers():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


# ============ Auth checks ============

def test_admin_list_no_token_returns_401(client):
    r = client.get(f"{API}/admin/scores")
    assert r.status_code == 401
    assert r.headers.get("WWW-Authenticate", "").lower().startswith("bearer")


def test_admin_list_wrong_token_returns_401(client):
    r = client.get(f"{API}/admin/scores", headers={"Authorization": "Bearer wrong"})
    assert r.status_code == 401


def test_admin_list_basic_auth_scheme_returns_401(client):
    """Bearer scheme expected — Basic should be rejected."""
    r = client.get(f"{API}/admin/scores", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert r.status_code == 401


def test_admin_delete_no_token_returns_401(client):
    r = client.delete(f"{API}/admin/scores/some-id")
    assert r.status_code == 401


# ============ Functional checks ============

def test_admin_list_returns_array(client, admin_headers):
    r = client.get(f"{API}/admin/scores", params={"limit": 5}, headers=admin_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    for entry in data:
        assert "id" in entry and "name" in entry and "score" in entry
        assert "_id" not in entry


def test_admin_list_filter_by_name(client, admin_headers):
    """Seed a known entry then filter by name."""
    payload = {"name": "ADMINFILTER", "score": 7}
    r = client.post(f"{API}/scores", json=payload)
    assert r.status_code == 200

    r2 = client.get(
        f"{API}/admin/scores", params={"name": "ADMINFILTER"}, headers=admin_headers
    )
    assert r2.status_code == 200
    rows = r2.json()
    assert len(rows) >= 1
    assert all(row["name"] == "ADMINFILTER" for row in rows)


def test_admin_list_filter_min_score(client, admin_headers):
    r = client.get(
        f"{API}/admin/scores",
        params={"min_score": 1, "limit": 100},
        headers=admin_headers,
    )
    assert r.status_code == 200
    for row in r.json():
        assert row["score"] >= 1


def test_admin_delete_round_trip(client, admin_headers):
    """Create -> list -> delete -> verify gone."""
    payload = {"name": "DELME", "score": 3}
    r = client.post(f"{API}/scores", json=payload)
    assert r.status_code == 200
    target_id = r.json()["id"]

    # Delete it via admin
    r2 = client.delete(f"{API}/admin/scores/{target_id}", headers=admin_headers)
    assert r2.status_code == 200
    body = r2.json()
    assert body == {"deleted": target_id, "ok": True}

    # Second delete must 404
    r3 = client.delete(f"{API}/admin/scores/{target_id}", headers=admin_headers)
    assert r3.status_code == 404


def test_admin_delete_unknown_id_returns_404(client, admin_headers):
    r = client.delete(f"{API}/admin/scores/00000000-0000-0000-0000-000000000000", headers=admin_headers)
    assert r.status_code == 404


def test_admin_list_limit_bounds(client, admin_headers):
    """Limit clamps to [1, 500]."""
    r = client.get(f"{API}/admin/scores", params={"limit": 9999}, headers=admin_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 500
