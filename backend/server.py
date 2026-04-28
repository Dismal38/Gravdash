from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===== Status check (kept for platform health) =====
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class StatusCheckCreate(BaseModel):
    client_name: str


@api_router.get("/")
async def root():
    return {"message": "GRAV-SHIFT API online"}


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(**input.model_dump())
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.status_checks.insert_one(doc)
    return status_obj


@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    rows = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
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
        # strip control chars, keep alphanumerics + space + a few symbols
        allowed = []
        for ch in v:
            if ch.isalnum() or ch in " _-.!":
                allowed.append(ch)
        cleaned = ''.join(allowed)[:12]
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
async def submit_score(payload: ScoreCreate):
    doc = {
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
async def list_scores(limit: int = 10):
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    rows = await db.scores.find(
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
async def get_rank(score: int):
    """How many entries are strictly higher than the given score (0 = #1)."""
    higher = await db.scores.count_documents({"score": {"$gt": int(score)}})
    total = await db.scores.count_documents({})
    return {"higher": higher, "rank": higher + 1, "total": total}


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
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
