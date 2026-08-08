from datetime import datetime, timezone
from time import monotonic
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase

from models import (
    AllocationUpdate,
    AiTravelPlanRequest,
    AiTravelRecommendationRequest,
    BookingCreate,
    MockUploadCreate,
    RealizationCreate,
    RABSubmissionCreate,
    RABAction,
    Role,
    ScheduleCreate,
    TravelRecommendationQuery,
    TripCreate,
    WorkflowAction,
)
from store import DEMO_PROFILES, get_demo_profile, now_iso, public_trip, public_trips, unique_id
from ai_service import stream_final_itinerary, stream_stage_recommendation, stream_travel_plan


def build_router(get_db):
    router = APIRouter(prefix="/api")
    ai_request_times: dict[str, list[float]] = {}

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

    @router.get("/notifications")
    async def list_notifications(profile_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
        return await db.notifications.find({"profile_id": profile_id}, {"_id": 0}).sort("created_at", -1).to_list(50)

    @router.post("/rab-submissions", status_code=201)
    async def create_rab_submission(payload: RABSubmissionCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        document = payload.model_dump()
        document.update({"id": unique_id("rab"), "status": "MENUNGGU KOORDINATOR", "created_at": now_iso()})
        await db.rab_submissions.insert_one(document.copy())
        return {key: value for key, value in document.items() if key != "_id"}

    @router.get("/rab-submissions")
    async def list_rab_submissions(db: AsyncIOMotorDatabase = Depends(get_db)):
        return await db.rab_submissions.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)

    @router.get("/rab-history")
    async def list_rab_history(db: AsyncIOMotorDatabase = Depends(get_db)):
        return await db.rab_submissions.find(
            {"status": {"$in": ["SELESAI REALISASI", "HISTORY"]}},
            {"_id": 0},
        ).sort("updated_at", -1).to_list(100)

    @router.post("/rab-submissions/{submission_id}/action")
    async def action_rab_submission(submission_id: str, payload: RABAction, db: AsyncIOMotorDatabase = Depends(get_db)):
        submission = await db.rab_submissions.find_one({"id": submission_id}, {"_id": 0})
        if not submission:
            raise HTTPException(status_code=404, detail="Pengajuan RAB tidak ditemukan.")
        flow = {
            "MENUNGGU KOORDINATOR": (Role.COORDINATOR, "MENUNGGU SPV"),
            "MENUNGGU SPV": (Role.SPV, "MENUNGGU MANAGER"),
            "MENUNGGU MANAGER": (Role.MANAGER, "MENUNGGU PEMESANAN"),
            "MENUNGGU PEMESANAN": (Role.SECRETARY, "MENUNGGU SPD KOORDINATOR"),
            "MENUNGGU SPD KOORDINATOR": (Role.COORDINATOR, "SIAP REALISASI PIC"),
        }
        if submission["status"] not in flow:
            raise HTTPException(status_code=400, detail="Pengajuan tidak berada pada tahap tindakan.")
        expected, next_status = flow[submission["status"]]
        if payload.actor_role != expected:
            raise HTTPException(status_code=403, detail=f"Tahap ini hanya untuk {expected.value}.")
        if submission["status"] == "MENUNGGU SPD KOORDINATOR" and payload.action != "spd_done":
            raise HTTPException(status_code=422, detail="Koordinator perlu menyelesaikan SPD.")
        status = "PERLU REVISI PIC" if payload.action == "revisi" else next_status
        update = {"status": status, "component_notes": payload.component_notes, "updated_at": now_iso()}
        await db.rab_submissions.update_one({"id": submission_id}, {"$set": update})
        return await db.rab_submissions.find_one({"id": submission_id}, {"_id": 0})

    @router.post("/rab-submissions/{submission_id}/resubmit")
    async def resubmit_rab_submission(submission_id: str, db: AsyncIOMotorDatabase = Depends(get_db)):
        submission = await db.rab_submissions.find_one({"id": submission_id}, {"_id": 0})
        if not submission:
            raise HTTPException(status_code=404, detail="Pengajuan RAB tidak ditemukan.")
        if submission["status"] != "PERLU REVISI PIC":
            raise HTTPException(status_code=400, detail="Hanya RAB revisi yang dapat diajukan ulang.")
        await db.rab_submissions.update_one({"id": submission_id}, {"$set": {"status": "MENUNGGU KOORDINATOR", "updated_at": now_iso()}})
        return await db.rab_submissions.find_one({"id": submission_id}, {"_id": 0})

    @router.get("/trips")
    async def list_trips(db: AsyncIOMotorDatabase = Depends(get_db)):
        return await public_trips(db)

    @router.get("/profiles/pics")
    async def list_pic_profiles():
        return [profile for profile in DEMO_PROFILES if profile["role"] == Role.PIC.value]

    @router.post("/trips/schedule", status_code=201)
    async def create_schedule(
        payload: ScheduleCreate,
        actor_role: Role,
        coordinator_profile_id: str,
        db: AsyncIOMotorDatabase = Depends(get_db),
    ):
        coordinator = get_demo_profile(coordinator_profile_id)
        pic = get_demo_profile(payload.pic_profile_id)
        if actor_role != Role.COORDINATOR or not coordinator or coordinator["role"] != Role.COORDINATOR.value:
            raise HTTPException(status_code=403, detail="Hanya Koordinator yang dapat membuat rencana perjalanan.")
        if coordinator["assigned_region"] != payload.region:
            raise HTTPException(status_code=403, detail="Koordinator hanya dapat membuat STO pada wilayah penugasannya.")
        if not pic or pic["role"] != Role.PIC.value:
            raise HTTPException(status_code=422, detail="PIC Accounting yang dipilih tidak valid.")
        document = payload.model_dump()
        document.pop("pic_profile_id")
        document.update({
            "id": unique_id("sto"),
            "traveler_name": pic["name"],
            "traveler_phone": pic["phone"],
            "traveler_email": pic["email"],
            "assigned_pic_id": pic["profile_id"],
            "created_by": coordinator["profile_id"],
            "allocations": [],
            "status": "DRAF ALOKASI PIC",
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

    @router.patch("/trips/{trip_id}/allocation")
    async def set_allocation(trip_id: str, payload: AllocationUpdate, db: AsyncIOMotorDatabase = Depends(get_db)):
        trip = await get_trip_or_404(trip_id, db)
        if payload.actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Hanya PIC Accounting yang dapat menentukan alokasi.")
        if trip.get("assigned_pic_id") != payload.pic_profile_id:
            raise HTTPException(status_code=403, detail="PIC hanya dapat mengatur alokasi untuk STO yang ditugaskan kepadanya.")
        if trip["status"] not in {"DRAF ALOKASI PIC", "PERLU REVISI"}:
            raise HTTPException(status_code=400, detail="Alokasi tidak dapat diubah pada tahap ini.")
        await db.trips.update_one(
            {"id": trip_id},
            {"$set": {"allocations": [item.model_dump() for item in payload.allocations], "status": "DRAF", "updated_at": now_iso()}},
        )
        return await get_trip_or_404(trip_id, db)

    @router.post("/trips", status_code=201)
    async def create_trip(payload: TripCreate, db: AsyncIOMotorDatabase = Depends(get_db)):
        raise HTTPException(status_code=403, detail="Gunakan rute penjadwalan Koordinator untuk membuat rencana STO.")

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
    async def submit_trip(
        trip_id: str,
        actor_role: Role,
        pic_profile_id: str = "",
        db: AsyncIOMotorDatabase = Depends(get_db),
    ):
        trip = await get_trip_or_404(trip_id, db)
        if actor_role != Role.PIC:
            raise HTTPException(status_code=403, detail="Hanya PIC Accounting yang dapat mengajukan RAB.")
        if trip.get("assigned_pic_id") and trip["assigned_pic_id"] != pic_profile_id:
            raise HTTPException(status_code=403, detail="PIC hanya dapat mengajukan RAB STO yang ditugaskan kepadanya.")
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
        if action == "revisi" and trip.get("assigned_pic_id"):
            notification = {
                "id": unique_id("notif"),
                "profile_id": trip["assigned_pic_id"],
                "trip_id": trip_id,
                "type": "REVISI RAB",
                "message": f"RAB {trip['title']} perlu direvisi oleh {payload.actor_role.value}.",
                "comment": payload.comment,
                "created_at": now_iso(),
            }
            await db.notifications.insert_one(notification)
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

    @router.post("/ai/travel-plan/stream")
    async def create_ai_travel_plan(payload: AiTravelPlanRequest):
        client_key = "global"
        now = monotonic()
        recent = [stamp for stamp in ai_request_times.get(client_key, []) if now - stamp < 60]
        if len(recent) >= 5:
            raise HTTPException(status_code=429, detail="Terlalu banyak permintaan AI. Coba lagi dalam satu menit.")
        ai_request_times[client_key] = [*recent, now]
        return StreamingResponse(
            stream_travel_plan(payload),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @router.post("/ai/travel-recommendations/stream")
    async def create_staged_ai_recommendation(payload: AiTravelRecommendationRequest):
        client_key = "global"
        now = monotonic()
        recent = [stamp for stamp in ai_request_times.get(client_key, []) if now - stamp < 60]
        if len(recent) >= 5:
            raise HTTPException(status_code=429, detail="Terlalu banyak permintaan AI. Coba lagi dalam satu menit.")
        ai_request_times[client_key] = [*recent, now]
        return StreamingResponse(
            stream_stage_recommendation(payload),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    @router.post("/ai/final-itinerary/stream")
    async def create_final_itinerary(payload: AiTravelRecommendationRequest):
        client_key = "global"
        now = monotonic()
        recent = [stamp for stamp in ai_request_times.get(client_key, []) if now - stamp < 60]
        if len(recent) >= 5:
            raise HTTPException(status_code=429, detail="Terlalu banyak permintaan AI. Coba lagi dalam satu menit.")
        ai_request_times[client_key] = [*recent, now]
        return StreamingResponse(
            stream_final_itinerary(payload),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    return router