import asyncio

from lib.db import db
from routers.rituals import DEMO_RITUALS


async def seed() -> None:
    if await db.rituals.count_documents({}) == 0:
        await db.rituals.insert_many(DEMO_RITUALS)
        print(f"Seeded {len(DEMO_RITUALS)} rituals")
    else:
        print("Rituals already seeded")


if __name__ == "__main__":
    asyncio.run(seed())