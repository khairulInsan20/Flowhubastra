from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import (
    BookingCreate,
    MockUploadCreate,
    RealizationCreate,
    Role,
    TravelRecommendationQuery,
    TripCreate,
    WorkflowAction,
)
from store import now_iso, public_trip, public_trips, unique_id


def build_router(get_db):
    router = APIRouter(prefix="/api")

    async def get_trip_or_404(trip_id: str, db: AsyncIOMotorDatabase) -> dict:
        trip = await public_trip(db, trip_id)
        if not trip:
            raise HTTPException(status_code=404, detail="Rencana STO tidak ditemukan.")
        return trip

    @router.get("/")
    async def root():
        return {"message": "STO Desk API aktif"}

    @router.get("/dashboard")
    async def dashboard(db: AsyncIOMotorDatabase = Depends(get_db)):
        trips = await public_trips(db)
        submitted = [trip for trip in trips if trip["status"] != "DRAF"]
        pending = [trip for trip in trips if "MENUNGGU" in trip["status"]]
        realized = [trip for trip in trips if trip.get("realization")]
        over_budget = [
            trip for trip in realized
            if sum(item["amount"] for item in trip["realization"]["expenses"]) > trip["total_budget"]
        ]
        return {
            "summary": {
                "total_trips": len(trips),
                "submitted": len(submitted),
                "pending": len(pending),
                "reimbursement_ready": len(realized),
                "over_budget": len(over_budget),
            },
            "trips": trips[:5],
        }

    @router.get("/trips")
    async def list_trips(db: AsyncIOMotorDatabase = Depends(get_db)):
        return await public_trips(db)

    @router.post("/trips", status_code=201)
    async def create_trip(payload: TripCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        document = payload.model_dump()
        document.update({
            "id": unique_id("sto"),
            "created_by": Role.PIC.value,
            "status": "DRAF",
            "approval_step": 0,
            "approval_history": [],
            "booking": None,
            "realization": None,
            "attachments": [],
            "created_at": now_iso(),
            "updated_at": now_iso(),
        })
        await db.trips.insert_one(document.copy())
        return {key: value for key, value in document.items() if key != "_id"}

    @router.get("/trips/{trip_id}")
    async def get_trip(trip_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
        return await get_trip_or_404(trip_id, db)

    @router.delete("/trips/{trip_id}")
    async def delete_draft_trip(
        trip_id: str,
        actor_role: Role,
        db: AsyncIOMotorDatabase = Depends(get_db),
    ):
        trip = await get_trip_or_404(trip_id, db)
        if actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Hanya PIC Accounting yang dapat menghapus draf RAB.")
        if trip["status"] not in {"DRAF", "PERLU REVISI"}:
            raise HTTPException(status_code=400, detail="Hanya draf atau RAB revisi yang dapat dihapus.")
        await db.trips.delete_one({"id": trip_id})
        return {"message": "Draf RAB berhasil dihapus."}

    @router.post("/trips/{trip_id}/submit")
    async def submit_trip(trip_id: str, actor_role: Role, db: AsyncIOMotorDatabase = Depends(get_db)):
        trip = await get_trip_or_404(trip_id, db)
        if actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Hanya PIC Accounting yang dapat mengajukan RAB.")
        if trip["status"] != "DRAF":
            raise HTTPException(status_code=400, detail="RAB ini sudah diajukan.")
        await db.trips.update_one({"id": trip_id}, {"$set": {"status": "MENUNGGU KOORDINATOR", "approval_step": 1, "updated_at": now_iso()}})
        return await get_trip_or_404(trip_id, db)

    @router.post("/trips/{trip_id}/approval")
    async def review_trip(trip_id: str, payload: WorkflowAction, db: AsyncIOMotorDatabase = Depends(get_db)):
        trip = await get_trip_or_404(trip_id, db)
        steps = {
            "MENUNGGU KOORDINATOR": (Role.COORDINATOR, "MENUNGGU SPV", 2),
            "MENUNGGU SPV": (Role.SPV, "MENUNGGU MANAGER", 3),
            "MENUNGGU MANAGER": (Role.MANAGER, "MENUNGGU PEMESANAN", 4),
            "MENUNGGU VERIFIKASI SEKRETARIS": (Role.SECRETARY, "REIMBURSEMENT SIAP", 5),
        }
        if trip["status"] not in steps:
            raise HTTPException(status_code=400, detail="RAB belum berada pada tahap review.")
        expected_role, next_status, next_step = steps[trip["status"]]
        if payload.actor_role != expected_role:
            raise HTTPException(status_code=403, detail=f"Tahap ini hanya dapat diproses oleh {expected_role.value}.")
        action = payload.action.strip().lower()
        if action not in {"approve", "revisi"}:
            raise HTTPException(status_code=422, detail="Aksi harus approve atau revisi.")
        if action == "revisi":
            status = "PERLU REVISI"
            step = 0
        else:
            status = next_status
            step = next_step
        history = {"role": payload.actor_role.value, "action": action, "comment": payload.comment, "at": now_iso()}
        await db.trips.update_one(
            {"id": trip_id},
            {"$set": {"status": status, "approval_step": step, "updated_at": now_iso()}, "$push": {"approval_history": history}},
        )
        return await get_trip_or_404(trip_id, db)

    @router.post("/trips/{trip_id}/booking")
    async def confirm_booking(trip_id: str, payload: BookingCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        trip = await get_trip_or_404(trip_id, db)
        if payload.actor_role != Role.SECRETARY:
            raise HTTPException(status_code=403, detail="Konfirmasi pemesanan hanya untuk Sekretaris Divisi.")
        if trip["status"] != "MENUNGGU PEMESANAN":
            raise HTTPException(status_code=400, detail="RAB belum siap untuk dipesankan.")
        booking = payload.model_dump(exclude={"actor_role"})
        booking["booked_at"] = now_iso()
        await db.trips.update_one({"id": trip_id}, {"$set": {"booking": booking, "status": "PERJALANAN TERKONFIRMASI", "updated_at": now_iso()}})
        return await get_trip_or_404(trip_id, db)

    @router.post("/trips/{trip_id}/attachments")
    async def add_mock_attachment(trip_id: str, payload: MockUploadCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        await get_trip_or_404(trip_id, db)
        if payload.actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Lampiran hanya dapat ditambahkan oleh PIC Accounting.")
        attachment = {"id": unique_id("file"), "file_name": payload.file_name, "evidence_type": payload.evidence_type, "uploaded_at": now_iso()}
        await db.trips.update_one({"id": trip_id}, {"$push": {"attachments": attachment}, "$set": {"updated_at": now_iso()}})
        return attachment

    @router.post("/trips/{trip_id}/realization")
    async def submit_realization(trip_id: str, payload: RealizationCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        trip = await get_trip_or_404(trip_id, db)
        if payload.actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Realisasi hanya dapat dikirim oleh PIC Accounting.")
        if trip["status"] not in {"PERJALANAN TERKONFIRMASI", "PERLU REVISI"}:
            raise HTTPException(status_code=400, detail="Realisasi dapat dikirim setelah perjalanan terkonfirmasi.")
        realization = payload.model_dump(exclude={"actor_role"})
        realization["submitted_at"] = now_iso()
        realization["total_actual"] = sum(item["amount"] for item in realization["expenses"])
        await db.trips.update_one({"id": trip_id}, {"$set": {"realization": realization, "status": "MENUNGGU VERIFIKASI SEKRETARIS", "updated_at": now_iso()}})
        return await get_trip_or_404(trip_id, db)

    @router.post("/recommendations")
    async def travel_recommendations(payload: TravelRecommendationQuery):
        hotel_cap = int(payload.budget * 0.45)
        ticket_cap = int(payload.budget * 0.30)
        return {
            "label": "Estimasi demonstrasi — verifikasi harga sebelum pemesanan",
            "items": [
                {"category": "Tiket kereta", "provider": "Kereta antarkota", "title": f"{payload.origin} → {payload.destination}", "estimate": ticket_cap, "note": "Pilih keberangkatan pagi untuk jadwal STO."},
                {"category": "Hotel", "provider": "Akomodasi bisnis", "title": "Hotel dekat cabang", "estimate": hotel_cap, "note": "Termasuk sarapan, jarak maksimal 5 km dari cabang."},
                {"category": "Transport lokal", "provider": "Ride-hailing / taksi", "title": "Bandara/stasiun ↔ cabang ↔ hotel", "estimate": int(payload.budget * 0.25), "note": "Estimasi rute, bukan harga kendaraan langsung."},
            ],
        }

    return router