from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid

from motor.motor_asyncio import AsyncIOMotorDatabase


DEMO_PROFILES = [
    {
        "profile_id": "pic-nadia",
        "role": "PIC Accounting",
        "name": "Nadia Pratama",
        "email": "nadia.pratama@auto2000.co.id",
        "phone": "081234567890",
        "assigned_region": "Jawa Barat",
    },
    {
        "profile_id": "pic-rizky",
        "role": "PIC Accounting",
        "name": "Rizky Mahendra",
        "email": "rizky.mahendra@auto2000.co.id",
        "phone": "081298765432",
        "assigned_region": "DKI Jakarta",
    },
    {
        "profile_id": "coord-jabar",
        "role": "Koordinator",
        "name": "Dewi Anggraini",
        "email": "dewi.anggraini@auto2000.co.id",
        "phone": "081355512345",
        "assigned_region": "Jawa Barat",
    },
]


def get_demo_profile(profile_id: str) -> Dict[str, Any] | None:
    return next((profile for profile in DEMO_PROFILES if profile["profile_id"] == profile_id), None)


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def seed_demo_data(db: AsyncIOMotorDatabase) -> None:
    if await db.trips.count_documents({}) > 0:
        return

    trip = {
        "id": "sto-jabar-2026-001",
        "title": "STO Part & Bahan Bandung",
        "region": "Jawa Barat",
        "branch": "Auto2000 Bandung Soekarno Hatta",
        "departure_city": "Jakarta",
        "start_date": "2026-03-18",
        "end_date": "2026-03-20",
        "total_budget": 4500000,
        "allocations": [
            {"category": "Tiket", "percentage": 30},
            {"category": "Hotel", "percentage": 45},
            {"category": "Transport lokal", "percentage": 25},
        ],
        "traveler_name": "Nadia Pratama",
        "traveler_phone": "081234567890",
        "created_by": "PIC Accounting",
        "status": "MENUNGGU KOORDINATOR",
        "approval_step": 1,
        "approval_history": [],
        "booking": None,
        "realization": None,
        "attachments": [
            {"id": "file-001", "file_name": "benchmark_hotel_bandung.pdf", "evidence_type": "Benchmarking hotel", "uploaded_at": now_iso()}
        ],
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.trips.insert_one(trip)


async def public_trip(db: AsyncIOMotorDatabase, trip_id: str) -> Dict[str, Any] | None:
    return await db.trips.find_one({"id": trip_id}, {"_id": 0})


async def public_trips(db: AsyncIOMotorDatabase) -> List[Dict[str, Any]]:
    return await db.trips.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)


def unique_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}"