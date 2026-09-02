from fastapi import APIRouter, HTTPException, status

from lib.db import db
from models.rituals import Ritual, RitualCreate


router = APIRouter(prefix="/rituals", tags=["rituals"])

DEMO_RITUALS = [
    {
        "id": "ritual-morning-pages",
        "title": "Morning pages",
        "category": "morning",
        "duration_minutes": 15,
        "frequency": "Every weekday",
        "priority": "high",
        "energy": "medium",
        "emoji": "☀️",
        "completed": True,
        "streak": 12,
    },
    {
        "id": "ritual-deep-work",
        "title": "Deep work sprint",
        "category": "deep-work",
        "duration_minutes": 50,
        "frequency": "Every day",
        "priority": "high",
        "energy": "high",
        "emoji": "⚡",
        "completed": False,
        "streak": 8,
    },
    {
        "id": "ritual-walk",
        "title": "Walk without a podcast",
        "category": "health",
        "duration_minutes": 30,
        "frequency": "4x a week",
        "priority": "medium",
        "energy": "low",
        "emoji": "🌿",
        "completed": False,
        "streak": 5,
    },
    {
        "id": "ritual-sketch",
        "title": "Sketch one idea",
        "category": "craft",
        "duration_minutes": 20,
        "frequency": "Every day",
        "priority": "medium",
        "energy": "medium",
        "emoji": "✦",
        "completed": False,
        "streak": 3,
    },
]


async def ensure_demo_rituals() -> None:
    if await db.rituals.count_documents({}) == 0:
        await db.rituals.insert_many(DEMO_RITUALS)


@router.get("", response_model=list[Ritual])
async def get_rituals() -> list[Ritual]:
    await ensure_demo_rituals()
    rituals = await db.rituals.find().to_list(1000)
    return [Ritual(**ritual) for ritual in rituals]


@router.post("", response_model=Ritual, status_code=status.HTTP_201_CREATED)
async def create_ritual(input: RitualCreate) -> Ritual:
    ritual = Ritual(**input.model_dump())
    await db.rituals.insert_one(ritual.model_dump())
    return ritual


@router.patch("/{ritual_id}/toggle", response_model=Ritual)
async def toggle_ritual(ritual_id: str) -> Ritual:
    current = await db.rituals.find_one({"id": ritual_id})
    if not current:
        raise HTTPException(status_code=404, detail="Ritual not found")

    completed = not current.get("completed", False)
    streak = current.get("streak", 0) + (1 if completed else -1)
    await db.rituals.update_one(
        {"id": ritual_id},
        {"$set": {"completed": completed, "streak": max(0, streak)}},
    )
    updated = await db.rituals.find_one({"id": ritual_id})
    return Ritual(**updated)


@router.delete("/{ritual_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_ritual(ritual_id: str) -> None:
    result = await db.rituals.delete_one({"id": ritual_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ritual not found")
