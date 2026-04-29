from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import hmac
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url: str = os.environ['MONGO_URL']
client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app: FastAPI = FastAPI()
api_router: APIRouter = APIRouter(prefix="/api")


# ===== Status check (kept for platform health) =====
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root() -> Dict[str, str]:
    return {"message": "GRAV-SHIFT API online"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate) -> StatusCheck:
    status_obj: StatusCheck = StatusCheck(**input.model_dump())
    doc: Dict[str, Any] = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks() -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for r in rows:
        if isinstance(r.get('timestamp'), str):
            r['timestamp'] = datetime.fromisoformat(r['timestamp'])
    return rows


# ===== Leaderboard =====
class ScoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=12)
    score: int = Field(ge=0, le=10_000_000)

    @field_validator('name')
    @classmethod
    def clean_name(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Name required")
        allowed: List[str] = []
        for ch in v:
            if ch.isalnum() or ch in " _-.!":
                allowed.append(ch)
        cleaned: str = ''.join(allowed)[:12]
        if not cleaned:
            raise ValueError("Name must contain alphanumeric characters")
        return cleaned


class ScoreOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    score: int
    timestamp: datetime


@api_router.post("/scores", response_model=ScoreOut)
async def submit_score(payload: ScoreCreate) -> ScoreOut:
    doc: Dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "score": int(payload.score),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await db.scores.insert_one(doc)
    return ScoreOut(
        id=doc["id"],
        name=doc["name"],
        score=doc["score"],
        timestamp=datetime.fromisoformat(doc["timestamp"]),
    )


@api_router.get("/scores", response_model=List[ScoreOut])
async def list_scores(limit: int = 10) -> List[ScoreOut]:
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    rows: List[Dict[str, Any]] = await db.scores.find(
        {}, {"_id": 0}
    ).sort([("score", -1), ("timestamp", 1)]).to_list(limit)
    out: List[ScoreOut] = []
    for r in rows:
        ts = r.get("timestamp")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        out.append(ScoreOut(id=r["id"], name=r["name"], score=int(r["score"]), timestamp=ts))
    return out


@api_router.get("/scores/rank")
async def get_rank(score: int) -> Dict[str, int]:
    """How many entries are strictly higher than the given score (0 = #1)."""
    higher: int = await db.scores.count_documents({"score": {"$gt": int(score)}})
    total: int = await db.scores.count_documents({})
    return {"higher": higher, "rank": higher + 1, "total": total}


# ===== Admin (single-token Bearer auth) =====
ADMIN_TOKEN: str = os.environ.get("ADMIN_TOKEN", "")
admin_security = HTTPBearer(auto_error=False)


def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(admin_security),
) -> str:
    """Validate the admin Bearer token using constant-time comparison."""
    if not ADMIN_TOKEN:
        # Server misconfiguration — refuse all admin requests rather than open up.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Admin endpoints not configured",
        )
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    provided = credentials.credentials.encode("utf-8")
    expected = ADMIN_TOKEN.encode("utf-8")
    if not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return "admin"


@api_router.get("/admin/scores", response_model=List[ScoreOut])
async def admin_list_scores(
    _: str = Depends(require_admin),
    limit: int = 50,
    name: Optional[str] = None,
    min_score: Optional[int] = None,
) -> List[ScoreOut]:
    """List leaderboard entries with optional filters. Newest first."""
    if limit < 1:
        limit = 1
    if limit > 500:
        limit = 500
    query: Dict[str, Any] = {}
    if name:
        query["name"] = {"$regex": name.strip().upper(), "$options": "i"}
    if min_score is not None:
        query["score"] = {"$gte": int(min_score)}
    rows: List[Dict[str, Any]] = await db.scores.find(
        query, {"_id": 0}
    ).sort([("timestamp", -1)]).to_list(limit)
    out: List[ScoreOut] = []
    for r in rows:
        ts = r.get("timestamp")
        if isinstance(ts, str):
            ts = datetime.fromisoformat(ts)
        out.append(ScoreOut(id=r["id"], name=r["name"], score=int(r["score"]), timestamp=ts))
    return out


@api_router.delete("/admin/scores/{score_id}")
async def admin_delete_score(
    score_id: str,
    _: str = Depends(require_admin),
) -> Dict[str, Any]:
    """Delete a single leaderboard entry by id (UUID stored in `id` field)."""
    result = await db.scores.delete_one({"id": score_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Score entry not found",
        )
    return {"deleted": score_id, "ok": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger: logging.Logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client() -> None:
    client.close()
