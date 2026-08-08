"""Central RAB submission endpoints (Bug fix verification)."""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sto-budget-tracker.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _payload():
    return {
        "title": "TEST_RAB Perjalanan STO",
        "items": [
            {"label": "Berangkat", "title": "KA Argo Parahyangan", "time": "07:00", "price": 250000, "note": "Kereta pagi",
             "proof_url": "https://static.prod-images.emergentagent.com/jobs/c2d847af-4193-46fc-8fa2-4c8aa430117f/images/67f094a33a4f68b0e8b64ba8c99221ed9c528ac00e380ce6b825d8a57bcc8823.jpeg"},
            {"label": "Hotel", "title": "Hotel Bisnis", "distance": "3km", "price": 850000, "note": "3 malam",
             "proof_url": "https://static.prod-images.emergentagent.com/jobs/c2d847af-4193-46fc-8fa2-4c8aa430117f/images/67f094a33a4f68b0e8b64ba8c99221ed9c528ac00e380ce6b825d8a57bcc8823.jpeg"},
        ],
        "notes": {"0": "kereta", "1": "hotel"},
    }


class TestRabSubmissions:
    def test_create_rab_submission(self, api):
        r = api.post(f"{BASE_URL}/api/rab-submissions", json=_payload())
        assert r.status_code == 201, r.text
        data = r.json()
        assert data["title"] == "TEST_RAB Perjalanan STO"
        assert data["status"] == "MENUNGGU KOORDINATOR"
        assert "id" in data and data["id"].startswith("rab")
        assert "created_at" in data
        assert len(data["items"]) == 2
        assert "_id" not in data

    def test_list_contains_created(self, api):
        created = api.post(f"{BASE_URL}/api/rab-submissions", json=_payload()).json()
        r = api.get(f"{BASE_URL}/api/rab-submissions")
        assert r.status_code == 200
        listing = r.json()
        assert isinstance(listing, list)
        ids = [item["id"] for item in listing]
        assert created["id"] in ids
        match = next(x for x in listing if x["id"] == created["id"])
        assert match["items"][0]["proof_url"].startswith("https://")
        assert "_id" not in match

    def test_missing_required_fields(self, api):
        r = api.post(f"{BASE_URL}/api/rab-submissions", json={"items": []})
        assert r.status_code == 422
