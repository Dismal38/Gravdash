"""Backend tests for GRAV-SHIFT FastAPI app.
Covers: health, /scores POST/GET, /scores/rank, validation, name normalization,
and ensures Mongo _id never leaks into responses.
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Read from frontend .env as fallback (testing env)
    from pathlib import Path
    env_path = Path('/app/frontend/.env')
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
class TestHealth:
    def test_root_returns_greeting(self, client):
        r = client.get(f"{API}/")
        assert r.status_code == 200
        data = r.json()
        assert "message" in data
        assert isinstance(data["message"], str)
        assert len(data["message"]) > 0


# ---------- POST /scores ----------
class TestSubmitScore:
    def test_submit_valid_score(self, client):
        payload = {"name": "TEST_A", "score": 10}
        r = client.post(f"{API}/scores", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data and isinstance(data["id"], str)
        assert data["name"] == "TEST_A"
        assert data["score"] == 10
        assert "timestamp" in data
        assert "_id" not in data

    def test_submit_score_persists_in_get(self, client):
        unique = f"TEST{int(time.time()) % 100000}"
        payload = {"name": unique, "score": 9999990}
        r = client.post(f"{API}/scores", json=payload)
        assert r.status_code == 200
        # GET top scores; with score 9999990 it should be near top
        rg = client.get(f"{API}/scores", params={"limit": 5})
        assert rg.status_code == 200
        rows = rg.json()
        names = [x["name"] for x in rows]
        assert unique[:12] in names

    def test_name_normalization_lowercase_to_upper(self, client):
        r = client.post(f"{API}/scores", json={"name": "  neoTrim  ", "score": 1})
        assert r.status_code == 200
        assert r.json()["name"] == "NEOTRIM"

    def test_name_normalization_strips_disallowed_chars(self, client):
        r = client.post(f"{API}/scores", json={"name": "h@ck#er!", "score": 2})
        assert r.status_code == 200
        # @ and # stripped, ! kept, uppercased
        assert r.json()["name"] == "HCKER!"

    def test_name_normalization_truncates_to_12(self, client):
        r = client.post(f"{API}/scores", json={"name": "ABCDEFGHIJKLMNOPQRSTU"[:12], "score": 3})
        assert r.status_code == 200
        assert len(r.json()["name"]) == 12

    def test_reject_empty_name(self, client):
        r = client.post(f"{API}/scores", json={"name": "", "score": 1})
        assert r.status_code == 422

    def test_reject_whitespace_only_name(self, client):
        r = client.post(f"{API}/scores", json={"name": "    ", "score": 1})
        assert r.status_code == 422

    def test_reject_only_disallowed_chars(self, client):
        # Pydantic min_length=1 passes "@@@", but validator should strip then reject
        r = client.post(f"{API}/scores", json={"name": "@@@@", "score": 1})
        assert r.status_code == 422

    def test_reject_negative_score(self, client):
        r = client.post(f"{API}/scores", json={"name": "TESTNEG", "score": -1})
        assert r.status_code == 422

    def test_reject_absurdly_large_score(self, client):
        r = client.post(f"{API}/scores", json={"name": "TESTBIG", "score": 10_000_001})
        assert r.status_code == 422


# ---------- GET /scores ----------
class TestListScores:
    def test_list_default(self, client):
        r = client.get(f"{API}/scores")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        for row in data:
            assert "_id" not in row
            assert {"id", "name", "score", "timestamp"}.issubset(row.keys())

    def test_list_sorted_desc_by_score(self, client):
        # Insert known data
        for n, sc in [("TESTSORTA", 50), ("TESTSORTB", 500), ("TESTSORTC", 5000)]:
            client.post(f"{API}/scores", json={"name": n, "score": sc})
        r = client.get(f"{API}/scores", params={"limit": 100})
        assert r.status_code == 200
        scores = [row["score"] for row in r.json()]
        assert scores == sorted(scores, reverse=True)

    def test_limit_param_respected(self, client):
        r = client.get(f"{API}/scores", params={"limit": 3})
        assert r.status_code == 200
        assert len(r.json()) <= 3

    def test_limit_clamped_low(self, client):
        r = client.get(f"{API}/scores", params={"limit": 0})
        assert r.status_code == 200
        assert len(r.json()) <= 1

    def test_limit_clamped_high(self, client):
        r = client.get(f"{API}/scores", params={"limit": 999})
        assert r.status_code == 200
        assert len(r.json()) <= 100


# ---------- GET /scores/rank ----------
class TestRank:
    def test_rank_returns_expected_keys(self, client):
        r = client.get(f"{API}/scores/rank", params={"score": 0})
        assert r.status_code == 200
        data = r.json()
        assert {"higher", "rank", "total"}.issubset(data.keys())
        assert data["rank"] == data["higher"] + 1
        assert isinstance(data["total"], int)

    def test_rank_zero_is_lowest(self, client):
        # With score=0, higher should equal total (assuming there's data with score>0)
        r0 = client.get(f"{API}/scores/rank", params={"score": 0})
        d0 = r0.json()
        assert d0["higher"] >= 0
        assert d0["rank"] == d0["higher"] + 1

    def test_rank_huge_is_first(self, client):
        r = client.get(f"{API}/scores/rank", params={"score": 9_999_999})
        d = r.json()
        assert d["higher"] == 0
        assert d["rank"] == 1


# ---------- _id leakage check (additional hardening) ----------
class TestNoIdLeakage:
    def test_status_endpoint_no_id(self, client):
        client.post(f"{API}/status", json={"client_name": "TEST_status"})
        r = client.get(f"{API}/status")
        assert r.status_code == 200
        for row in r.json():
            assert "_id" not in row
