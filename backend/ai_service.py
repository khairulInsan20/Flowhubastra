import json
import logging
import os
import uuid
from typing import AsyncGenerator

from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

from models import AiTravelPlanRequest


SYSTEM_MESSAGE = """You are a corporate STO travel planning assistant for Auto2000.
Reply in Bahasa Indonesia. Use only the provided planning context. Do not state that
estimated prices are live or bookable. Produce a concise, practical plan with these
headings: Ringkasan rekomendasi, Itinerary, Estimasi biaya, Alternatif hemat, and
Catatan verifikasi. Show all money in Indonesian Rupiah. Include a realistic caveat
that the PIC and Secretary must verify transport and hotel availability before booking.
Respect the selected airport, hotel, and local transport route as the primary choice,
then offer two or three alternative cost-saving approaches."""

logger = logging.getLogger(__name__)


def build_prompt(payload: AiTravelPlanRequest) -> str:
    return f"""Buatkan rencana perjalanan STO yang dapat direview PIC Accounting.

Kota keberangkatan: {payload.origin}
Cabang tujuan: {payload.branch}
Tanggal STO: {payload.start_date} sampai {payload.end_date}
Total anggaran: Rp{payload.total_budget:,}
Preferensi PIC: {payload.preference}

Keputusan tahap 1 - bandara:
- {payload.airport_name} ({payload.airport_code})
- Jarak ke cabang: {payload.airport_distance}
- Estimasi transfer: Rp{payload.airport_transfer:,}

Keputusan tahap 2 - penginapan:
- {payload.hotel_name}
- Jarak ke cabang: {payload.hotel_distance}
- Estimasi per malam: Rp{payload.hotel_nightly:,}

Keputusan tahap 3 - transport lokal utama:
- Rute: {payload.transport_route}
- Moda: {payload.transport_mode}
- Estimasi: Rp{payload.transport_estimate:,}

Susun itinerary pergi, aktivitas STO, dan pulang. Berikan estimasi per pos biaya yang
masuk akal tanpa mengarang ketersediaan atau harga live."""


async def stream_travel_plan(payload: AiTravelPlanRequest) -> AsyncGenerator[str, None]:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        yield "event: error\ndata: Konfigurasi AI belum tersedia.\n\n"
        return

    chat = LlmChat(
        api_key=api_key,
        session_id=f"sto-travel-{uuid.uuid4().hex}",
        system_message=SYSTEM_MESSAGE,
    ).with_model("openai", "gpt-5.4")

    try:
        async for event in chat.stream_message(UserMessage(text=build_prompt(payload))):
            if isinstance(event, TextDelta):
                yield f"data: {json.dumps({'delta': event.content})}\n\n"
            elif isinstance(event, StreamDone):
                yield "event: done\ndata: {}\n\n"
    except Exception:
        logger.exception("GPT-5.4 travel-plan stream failed")
        yield "event: error\ndata: Gagal membuat rekomendasi AI. Silakan coba lagi.\n\n"