import json
import logging
import os
import uuid
from typing import AsyncGenerator

from models import AiTravelPlanRequest
from models import AiTravelRecommendationRequest

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


async def stream_travel_plan(
    payload: AiTravelPlanRequest,
) -> AsyncGenerator[str, None]:

    api_key = os.environ.get("EMERGENT_LLM_KEY")

    if not api_key:
        yield "event: error\ndata: Konfigurasi AI belum tersedia.\n\n"
        return

    try:
        from emergentintegrations.llm.chat import (
            LlmChat,
            StreamDone,
            TextDelta,
            UserMessage,
        )

        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"sto-travel-{uuid.uuid4().hex}",
                system_message=SYSTEM_MESSAGE,
            )
            .with_model("openai", "gpt-5.4")
        )

        async for event in chat.stream_message(
            UserMessage(text=build_prompt(payload))
        ):
            if isinstance(event, TextDelta):
                yield f"data: {json.dumps({'delta': event.content})}\n\n"

            elif isinstance(event, StreamDone):
                yield "event: done\ndata: {}\n\n"

    except Exception:
        logger.exception("GPT travel-plan stream failed")
        yield "event: error\ndata: Gagal membuat rekomendasi AI. Silakan coba lagi.\n\n"


def build_stage_prompt(payload: AiTravelRecommendationRequest) -> str:
    visits = "\n".join(
        f"- {item.visit_date}: {item.branch_name}"
        for item in payload.branch_visits
    )

    legs = "\n".join(
        f"- {item.purpose}: {item.route}"
        for item in payload.transport_legs
    ) or "Belum ada rute transport lokal."

    instructions = {
        "ticket": (
            "Cari pilihan tiket pergi-pulang yang relevan. "
            "Bandingkan waktu, moda, dan estimasi biaya."
        ),
        "hotel": (
            "Cari hotel dekat cabang-cabang pada jadwal. "
            "Bandingkan jarak, estimasi per malam, dan kecocokan jadwal."
        ),
        "local_transport": (
            "Cari opsi transport paling tepat untuk setiap rute "
            "yang dipilih PIC. Berikan estimasi per leg."
        ),
    }

    return f"""Gunakan browsing web untuk tahap {payload.stage}. {instructions[payload.stage]}

Kota asal: {payload.origin}
Budget yang ditetapkan Koordinator (tidak dapat diubah PIC): Rp{payload.total_budget:,}

Jadwal cabang STO:
{visits}

Preferensi PIC:
{payload.preference}

Tiket yang dipilih pada tahap sebelumnya:
{payload.selected_ticket or 'Belum dipilih'}

Hotel yang dipilih pada tahap sebelumnya:
{payload.selected_hotel or 'Belum dipilih'}

Rute transport lokal yang wajib dianalisis:
{legs}

Jawab dalam Bahasa Indonesia. Beri 2-3 rekomendasi yang dapat dipilih,
estimasi biaya, alasan singkat, dan bagian 'Sumber web' berisi URL sumber
yang ditemukan.

Semua harga harus diberi label estimasi dan tidak boleh diklaim sebagai
ketersediaan atau harga live.
"""


async def stream_stage_recommendation(
    payload: AiTravelRecommendationRequest,
) -> AsyncGenerator[str, None]:

    api_key = os.environ.get("EMERGENT_LLM_KEY")

    if not api_key:
        yield "event: error\ndata: Konfigurasi AI belum tersedia.\n\n"
        return

    try:
        from emergentintegrations.llm.chat import (
            LlmChat,
            StreamDone,
            TextDelta,
            UserMessage,
        )

        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"sto-stage-{uuid.uuid4().hex}",
                system_message=SYSTEM_MESSAGE,
            )
            .with_model("gemini", "gemini-3.5-flash")
            .with_tools([{"googleSearch": {}}])
        )

        async for event in chat.stream_message(
            UserMessage(text=build_stage_prompt(payload))
        ):
            if isinstance(event, TextDelta):
                yield f"data: {json.dumps({'delta': event.content})}\n\n"

            elif isinstance(event, StreamDone):
                yield "event: done\ndata: {}\n\n"

    except Exception:
        logger.exception(
            "Gemini staged browsing recommendation failed"
        )
        yield "event: error\ndata: Gagal mencari rekomendasi AI. Silakan coba lagi.\n\n"


async def stream_final_itinerary(
    payload: AiTravelRecommendationRequest,
) -> AsyncGenerator[str, None]:

    api_key = os.environ.get("EMERGENT_LLM_KEY")

    if not api_key:
        yield "event: error\ndata: Konfigurasi AI belum tersedia.\n\n"
        return

    try:
        from emergentintegrations.llm.chat import (
            LlmChat,
            StreamDone,
            TextDelta,
            UserMessage,
        )

        chat = (
            LlmChat(
                api_key=api_key,
                session_id=f"sto-final-{uuid.uuid4().hex}",
                system_message=SYSTEM_MESSAGE,
            )
            .with_model("openai", "gpt-5.4")
        )

        prompt = f"""Susun itinerary STO final dalam Bahasa Indonesia berdasarkan
keputusan PIC berikut.

Tiket terpilih:
{payload.selected_ticket}

Hotel terpilih:
{payload.selected_hotel}

Transport terpilih:
{payload.selected_transport}

Rute transport lokal:
{', '.join(leg.route for leg in payload.transport_legs)}

Jadwal cabang:
{', '.join(
    f'{item.visit_date} {item.branch_name}'
    for item in payload.branch_visits
)}

Budget Koordinator:
Rp{payload.total_budget:,}

Berikan itinerary per hari, estimasi total biaya,
risiko overbudget, dan catatan verifikasi.
"""

        async for event in chat.stream_message(
            UserMessage(text=prompt)
        ):
            if isinstance(event, TextDelta):
                yield f"data: {json.dumps({'delta': event.content})}\n\n"

            elif isinstance(event, StreamDone):
                yield "event: done\ndata: {}\n\n"

    except Exception:
        logger.exception(
            "GPT final itinerary stream failed"
        )
        yield "event: error\ndata: Gagal menyusun itinerary akhir. Silakan coba lagi.\n\n"
