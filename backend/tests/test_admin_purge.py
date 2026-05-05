"""Tests for the bulk-purge admin endpoint."""
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


@pytest.fixture
def client():
    return requests.Session()


@pytest.fixture
def admin_headers():
    return {"Authorization": f"Bearer {ADMIN_TOKEN}"}


def test_purge_no_token_returns_401(client):
    r = client.post(f"{API}/admin/scores/purge", params={"name_pattern": "x"})
    assert r.status_code == 401


def test_purge_with_no_filters_returns_400(client, admin_headers):
    """Refuse to nuke the whole collection."""
    r = client.post(f"{API}/admin/scores/purge", headers=admin_headers)
    assert r.status_code == 400


def test_purge_dry_run_returns_count_without_deleting(client, admin_headers):
    # Seed 3 entries with a unique name pattern
    name = "PURGEDRY"
    for i in range(3):
        client.post(f"{API}/scores", json={"name": name, "score": i + 1})

    # Dry-run (confirm=false default)
    r = client.post(
        f"{API}/admin/scores/purge",
        params={"name_pattern": name},
        headers=admin_headers,
    )
    assert r.status_code == 200
    body = r.json()
    assert body["dry_run"] is True
    assert body["would_delete"] >= 3
    assert body["deleted"] == 0

    # Verify rows still exist
    r2 = client.get(
        f"{API}/admin/scores", params={"name": name}, headers=admin_headers
    )
    assert len(r2.json()) >= 3

    # Now actually purge
    r3 = client.post(
        f"{API}/admin/scores/purge",
        params={"name_pattern": name, "confirm": "true"},
        headers=admin_headers,
    )
    assert r3.status_code == 200
    body3 = r3.json()
    assert body3["dry_run"] is False
    assert body3["deleted"] >= 3

    # Verify rows are gone
    r4 = client.get(
        f"{API}/admin/scores", params={"name": name}, headers=admin_headers
    )
    assert len(r4.json()) == 0


def test_purge_by_min_score(client, admin_headers):
    # Seed 2 high-score entries
    name = "PURGEBYSCORE"
    client.post(f"{API}/scores", json={"name": name, "score": 999998})
    client.post(f"{API}/scores", json={"name": name, "score": 999999})

    r = client.post(
        f"{API}/admin/scores/purge",
        params={"name_pattern": name, "min_score": 999998, "confirm": "true"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    assert r.json()["deleted"] >= 2

    # Cleanup any stragglers
    r2 = client.post(
        f"{API}/admin/scores/purge",
        params={"name_pattern": name, "confirm": "true"},
        headers=admin_headers,
    )
    assert r2.status_code == 200


def test_purge_regex_metachars_treated_literally(client, admin_headers):
    """Pasting '.+' shouldn't accidentally match every name."""
    r = client.post(
        f"{API}/admin/scores/purge",
        params={"name_pattern": ".+", "confirm": "false"},
        headers=admin_headers,
    )
    assert r.status_code == 200
    # Only names that contain the literal characters ".+" would match
    assert r.json()["dry_run"] is True
    assert r.json()["would_delete"] == 0  # no real player has '.+' in their name
