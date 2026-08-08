"""Backend tests for the AI travel-plan streaming endpoint."""
import os
import json
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sto-budget-tracker.preview.emergentagent.com").rstrip("/")
ENDPOINT = f"{BASE_URL}/api/ai/travel-plan/stream"

VALID_PAYLOAD = {
    "origin": "Jakarta",
    "branch": "Auto2000 Bandung Soekarno Hatta",
    "start_date": "2026-04-14",
    "end_date": "2026-04-16",
    "total_budget": 4500000,
    "preference": "Prioritaskan jadwal pagi dan hotel dekat cabang.",
    "airport_name": "Husein Sastranegara",
    "airport_code": "BDO",
    "airport_distance": "6,8 km ke cabang",
    "airport_transfer": 75000,
    "hotel_name": "HARRIS Hotel & Conventions Ciumbuleuit",
    "hotel_distance": "3,1 km dari cabang",
    "hotel_nightly": 670000,
    "transport_route": "BDO → Cabang",
    "transport_mode": "Taksi bandara / ride-hailing",
    "transport_estimate": 75000,
}


def _read_stream(resp, max_seconds=30):
    """Collect SSE data deltas as a plain concatenated string."""
    text_out = []
    got_error = False
    import time
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
                # non-JSON data (like error/done payloads) — ignore
                pass
    return "".join(text_out), got_error


def test_ai_travel_plan_stream_valid_payload():
    with requests.post(ENDPOINT, json=VALID_PAYLOAD, stream=True, timeout=60) as r:
        assert r.status_code == 200, f"Expected 200 got {r.status_code}: {r.text[:200]}"
        assert "text/event-stream" in r.headers.get("content-type", "")
        text, got_error = _read_stream(r)
        assert not got_error, "Stream reported an error event"
        assert len(text) > 120, f"Expected substantial Indonesian plan text, got {len(text)} chars: {text!r}"
        # Sanity check Indonesian content markers appear
        lowered = text.lower()
        assert any(k in lowered for k in ["itinerary", "estimasi", "rp", "ringkasan", "alternatif"]), (
            f"Expected Indonesian planning keywords in output. Got: {text[:400]}"
        )


def test_ai_travel_plan_stream_invalid_payload_returns_422():
    bad = {"origin": "J"}  # missing required fields
    r = requests.post(ENDPOINT, json=bad, timeout=15)
    assert r.status_code == 422, f"Expected 422 for invalid payload, got {r.status_code}: {r.text[:200]}"


def test_ai_travel_plan_stream_negative_budget_rejected():
    bad = dict(VALID_PAYLOAD)
    bad["total_budget"] = 0  # violates gt=0
    r = requests.post(ENDPOINT, json=bad, timeout=15)
    assert r.status_code == 422, f"Expected 422 for zero budget, got {r.status_code}"
