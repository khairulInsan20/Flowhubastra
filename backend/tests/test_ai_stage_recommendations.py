"""Backend tests for new staged Gemini/GPT AI Travel Assistant endpoints."""
import os
import json
import time
import requests
import pytest

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or "https://sto-budget-tracker.preview.emergentagent.com").rstrip("/")
STAGE_ENDPOINT = f"{BASE_URL}/api/ai/travel-recommendations/stream"
FINAL_ENDPOINT = f"{BASE_URL}/api/ai/final-itinerary/stream"


def _base_payload(stage="ticket", selected_ticket="", selected_hotel="", legs=None):
    return {
        "stage": stage,
        "origin": "Jakarta",
        "total_budget": 6500000,
        "branch_visits": [
            {"visit_date": "2026-04-14", "branch_name": "Auto2000 Bandung Soekarno Hatta"},
            {"visit_date": "2026-04-15", "branch_name": "Auto2000 Bandung Setiabudi"},
        ],
        "preference": "Prioritaskan jadwal pagi dan hotel dekat cabang.",
        "selected_ticket": selected_ticket,
        "selected_hotel": selected_hotel,
        "transport_legs": legs or [],
    }


def _read_stream(resp, max_seconds=90):
    text_out = []
    got_error = False
    start = time.time()
    for raw in resp.iter_lines(decode_unicode=True):
        if time.time() - start > max_seconds:
            break
        if not raw:
            continue
        if raw.startswith("event: error"):
            got_error = True
        if raw.startswith("data: "):
            data = raw[len("data: "):]
            try:
                parsed = json.loads(data)
                if isinstance(parsed, dict) and "delta" in parsed:
                    text_out.append(parsed["delta"])
            except Exception:
                pass
    return "".join(text_out), got_error


# ---- Ticket stage (Gemini + Google Search grounding) ----
def test_ticket_stage_stream_returns_substantial_content():
    payload = _base_payload(stage="ticket")
    with requests.post(STAGE_ENDPOINT, json=payload, stream=True, timeout=120) as r:
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text[:300]}"
        assert "text/event-stream" in r.headers.get("content-type", "")
        text, got_error = _read_stream(r, max_seconds=90)
        assert not got_error, "Stream reported error event"
        assert len(text) > 120, f"Expected >120 chars of Gemini output, got {len(text)}: {text[:300]!r}"


# ---- Validation errors ----
def test_stage_invalid_stage_rejected():
    payload = _base_payload(stage="ticket")
    payload["stage"] = "sightseeing"
    r = requests.post(STAGE_ENDPOINT, json=payload, timeout=15)
    assert r.status_code == 422


def test_stage_missing_branch_visits_rejected():
    payload = _base_payload(stage="ticket")
    payload["branch_visits"] = []
    r = requests.post(STAGE_ENDPOINT, json=payload, timeout=15)
    assert r.status_code == 422


# ---- Hotel stage after ticket selected ----
def test_hotel_stage_stream_returns_content():
    payload = _base_payload(
        stage="hotel",
        selected_ticket="Kereta Argo Parahyangan 06:30 Gambir → Bandung, estimasi Rp210.000",
    )
    with requests.post(STAGE_ENDPOINT, json=payload, stream=True, timeout=120) as r:
        assert r.status_code == 200
        text, got_error = _read_stream(r, max_seconds=90)
        assert not got_error
        assert len(text) > 120, f"Expected >120 chars, got {len(text)}"


# ---- Final GPT itinerary after all stages ----
def test_final_itinerary_stream_returns_content():
    payload = _base_payload(
        stage="local_transport",
        selected_ticket="Kereta Argo Parahyangan 06:30 Gambir → Bandung",
        selected_hotel="HARRIS Hotel & Conventions Ciumbuleuit",
        legs=[
            {"route": "Rumah → Stasiun Gambir", "purpose": "Perjalanan dinas STO"},
            {"route": "Stasiun Bandung → Cabang Soekarno Hatta", "purpose": "Perjalanan dinas STO"},
            {"route": "Cabang → HARRIS Hotel", "purpose": "Perjalanan dinas STO"},
            {"route": "Hotel → Stasiun Bandung", "purpose": "Perjalanan dinas STO"},
        ],
    )
    with requests.post(FINAL_ENDPOINT, json=payload, stream=True, timeout=120) as r:
        assert r.status_code == 200
        text, got_error = _read_stream(r, max_seconds=90)
        assert not got_error
        assert len(text) > 200, f"Expected >200 chars of final itinerary, got {len(text)}"
        lowered = text.lower()
        assert any(k in lowered for k in ["itinerary", "estimasi", "rp", "ringkasan"])
