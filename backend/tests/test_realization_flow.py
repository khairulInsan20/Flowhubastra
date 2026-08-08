"""Tests for PIC realization -> Secretary review (BPH/revisi) flow."""
import os
import pytest
import requests

from dotenv import load_dotenv
load_dotenv("/app/frontend/.env")
BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def _find_by_status(status):
    r = requests.get(f"{BASE}/api/rab-submissions", timeout=15)
    r.raise_for_status()
    for s in r.json():
        if s["status"] == status:
            return s
    return None


def _create_and_march_to(target_status):
    """Create a fresh rab_submission and march via /action to target status."""
    payload = {
        "title": "TEST_realization_flow",
        "requester_role": "PIC Accounting",
        "items": [
            {"label": "Transport", "title": "Kereta ke Bandung", "time": "07:00", "note": "n/a",
             "proof_url": "https://example.com/p.png"},
            {"label": "Hotel", "title": "Hotel A", "date": "2026-01-10", "note": "n/a",
             "proof_url": "https://example.com/p.png"},
        ],
        "component_notes": {},
    }
    r = requests.post(f"{BASE}/api/rab-submissions", json=payload, timeout=15)
    assert r.status_code in (200, 201), r.text
    sid = r.json()["id"]

    transitions = [
        ("Koordinator", "approve"),
        ("SPV", "approve"),
        ("Manager", "approve"),
        ("Sekretaris Divisi", "booked"),
        ("Koordinator", "spd_done"),
    ]
    status_after = [
        "MENUNGGU SPV", "MENUNGGU MANAGER", "MENUNGGU PEMESANAN",
        "MENUNGGU SPD KOORDINATOR", "SIAP REALISASI PIC",
    ]
    for (role, action), expected in zip(transitions, status_after):
        rr = requests.post(f"{BASE}/api/rab-submissions/{sid}/action",
                           json={"actor_role": role, "action": action, "component_notes": {}}, timeout=15)
        assert rr.status_code == 200, f"{role}/{action}: {rr.status_code} {rr.text}"
        assert rr.json()["status"] == expected
        if expected == target_status:
            return sid, rr.json()

    if target_status == "SELESAI REALISASI":
        rr = requests.post(f"{BASE}/api/rab-submissions/{sid}/realization-complete", timeout=15)
        assert rr.status_code == 200, rr.text
        assert rr.json()["status"] == "SELESAI REALISASI"
        return sid, rr.json()

    return sid, None


class TestRealizationFlow:
    def test_pic_send_realization_transitions_to_selesai(self):
        sid, _ = _create_and_march_to("SIAP REALISASI PIC")
        r = requests.post(f"{BASE}/api/rab-submissions/{sid}/realization-complete", timeout=15)
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "SELESAI REALISASI"

        # GET verifies persistence
        got = _find_by_status_by_id(sid)
        assert got and got["status"] == "SELESAI REALISASI"

    def test_secretary_revisi_lampiran(self):
        sid, _ = _create_and_march_to("SELESAI REALISASI")
        r = requests.post(
            f"{BASE}/api/rab-submissions/{sid}/realization-action",
            json={"actor_role": "Sekretaris Divisi", "action": "revisi",
                  "component_notes": {"0": "nota kurang jelas"}},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "PERLU REVISI LAMPIRAN PIC"
        assert r.json()["component_notes"]["0"] == "nota kurang jelas"

    def test_secretary_approve_creates_bph(self):
        sid, _ = _create_and_march_to("SELESAI REALISASI")
        r = requests.post(
            f"{BASE}/api/rab-submissions/{sid}/realization-action",
            json={"actor_role": "Sekretaris Divisi", "action": "bph_created", "component_notes": {}},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["status"] == "BPH DIBUAT"

    def test_realization_complete_blocked_when_not_ready(self):
        # Fresh submission still MENUNGGU KOORDINATOR
        payload = {"title": "TEST_block", "requester_role": "PIC Accounting",
                   "items": [{"label": "x", "title": "x", "proof_url": "u"}], "component_notes": {}}
        r = requests.post(f"{BASE}/api/rab-submissions", json=payload, timeout=15)
        sid = r.json()["id"]
        rr = requests.post(f"{BASE}/api/rab-submissions/{sid}/realization-complete", timeout=15)
        assert rr.status_code == 400

    def test_realization_action_forbids_non_secretary(self):
        sid, _ = _create_and_march_to("SELESAI REALISASI")
        rr = requests.post(
            f"{BASE}/api/rab-submissions/{sid}/realization-action",
            json={"actor_role": "PIC Accounting", "action": "bph_created", "component_notes": {}},
            timeout=15,
        )
        assert rr.status_code == 403


def _find_by_status_by_id(sid):
    r = requests.get(f"{BASE}/api/rab-submissions", timeout=15)
    for s in r.json():
        if s["id"] == sid:
            return s
    return None
