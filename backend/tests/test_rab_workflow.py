"""End-to-end RAB workflow: create -> approvals -> booking -> SPD -> Realisasi -> History."""
import os
import requests
import pytest

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


@pytest.fixture
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _payload():
    return {
        "title": "TEST_RAB Full Lifecycle",
        "items": [
            {"label": "Berangkat", "title": "KA Argo", "price": 250000, "proof_url": "https://example.com/x.jpg"},
            {"label": "Hotel", "title": "Hotel Bisnis", "price": 850000, "proof_url": "https://example.com/y.jpg"},
        ],
        "notes": {"0": "kereta", "1": "hotel"},
    }


def _advance_to(api, target):
    """Create and drive a submission to the requested status."""
    sub = api.post(f"{BASE_URL}/api/rab-submissions", json=_payload()).json()
    sid = sub["id"]
    transitions = [
        ("Koordinator", "approve"),
        ("SPV", "approve"),
        ("Manager", "approve"),
        ("Sekretaris Divisi", "booked"),
        ("Koordinator", "spd_done"),
    ]
    status_after = ["MENUNGGU SPV", "MENUNGGU MANAGER", "MENUNGGU PEMESANAN", "MENUNGGU SPD KOORDINATOR", "SIAP REALISASI PIC"]
    for (role, action), expected in zip(transitions, status_after):
        r = api.post(f"{BASE_URL}/api/rab-submissions/{sid}/action",
                     json={"actor_role": role, "action": action, "component_notes": {}})
        assert r.status_code == 200, f"{role}/{action} -> {r.status_code} {r.text}"
        assert r.json()["status"] == expected
        if expected == target:
            return sid
    return sid


class TestSpdAndRealisasi:
    def test_secretary_booked_transitions_to_spd_koordinator(self, api):
        sid = _advance_to(api, "MENUNGGU SPD KOORDINATOR")
        r = api.get(f"{BASE_URL}/api/rab-submissions")
        found = next(x for x in r.json() if x["id"] == sid)
        assert found["status"] == "MENUNGGU SPD KOORDINATOR"

    def test_koordinator_spd_done_transitions_to_siap_realisasi(self, api):
        sid = _advance_to(api, "SIAP REALISASI PIC")
        r = api.get(f"{BASE_URL}/api/rab-submissions")
        found = next(x for x in r.json() if x["id"] == sid)
        assert found["status"] == "SIAP REALISASI PIC"

    def test_spd_action_must_be_spd_done(self, api):
        sid = _advance_to(api, "MENUNGGU SPD KOORDINATOR")
        # Wrong action value
        r = api.post(f"{BASE_URL}/api/rab-submissions/{sid}/action",
                     json={"actor_role": "Koordinator", "action": "approve", "component_notes": {}})
        assert r.status_code == 422

    def test_spd_wrong_role_rejected(self, api):
        sid = _advance_to(api, "MENUNGGU SPD KOORDINATOR")
        r = api.post(f"{BASE_URL}/api/rab-submissions/{sid}/action",
                     json={"actor_role": "PIC Accounting", "action": "spd_done", "component_notes": {}})
        assert r.status_code == 403

    def test_realization_complete_transitions_to_selesai(self, api):
        sid = _advance_to(api, "SIAP REALISASI PIC")
        r = api.post(f"{BASE_URL}/api/rab-submissions/{sid}/realization-complete")
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "SELESAI REALISASI"

    def test_realization_complete_requires_siap_status(self, api):
        # Fresh submission is MENUNGGU KOORDINATOR, not SIAP REALISASI PIC
        sub = api.post(f"{BASE_URL}/api/rab-submissions", json=_payload()).json()
        r = api.post(f"{BASE_URL}/api/rab-submissions/{sub['id']}/realization-complete")
        assert r.status_code == 400


class TestRabHistory:
    def test_history_endpoint_includes_completed(self, api):
        sid = _advance_to(api, "SIAP REALISASI PIC")
        api.post(f"{BASE_URL}/api/rab-submissions/{sid}/realization-complete")
        r = api.get(f"{BASE_URL}/api/rab-history")
        assert r.status_code == 200
        ids = [item["id"] for item in r.json()]
        assert sid in ids

    def test_history_excludes_in_progress(self, api):
        sub = api.post(f"{BASE_URL}/api/rab-submissions", json=_payload()).json()
        r = api.get(f"{BASE_URL}/api/rab-history")
        ids = [item["id"] for item in r.json()]
        assert sub["id"] not in ids

    def test_history_no_mongo_id_leak(self, api):
        sid = _advance_to(api, "SIAP REALISASI PIC")
        api.post(f"{BASE_URL}/api/rab-submissions/{sid}/realization-complete")
        r = api.get(f"{BASE_URL}/api/rab-history")
        for item in r.json():
            assert "_id" not in item
