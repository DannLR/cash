from typing import Literal
from uuid import uuid4

from pydantic import BaseModel, Field


Category = Literal["morning", "deep-work", "health", "craft"]
Priority = Literal["low", "medium", "high"]
Energy = Literal["low", "medium", "high"]


class RitualCreate(BaseModel):
    title: str = Field(min_length=2, max_length=80)
    category: Category
    duration_minutes: int = Field(ge=5, le=180)
    frequency: str = Field(min_length=2, max_length=40)
    priority: Priority
    energy: Energy
    emoji: str = Field(min_length=1, max_length=4)


class Ritual(RitualCreate):
    id: str = Field(default_factory=lambda: str(uuid4()))
    completed: bool = False
    streak: int = Field(default=0, ge=0)
