import { useEffect, useState } from "react";
import { CalendarPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createSchedule, getPicProfiles } from "@/api";

export default function CoordinatorSchedulePanel() {
  const [profiles, setProfiles] = useState([]);
  const [form, setForm] = useState({
    title: "STO Part & Bahan Bandung",
    region: "Jawa Barat",
    branch: "Auto2000 Bandung Soekarno Hatta",
    departure_city: "Jakarta",
    start_date: "2026-04-14",
    end_date: "2026-04-16",
    total_budget: "4500000",
    pic_profile_id: "pic-nadia",
  });

  useEffect(() => {
    getPicProfiles().then(setProfiles).catch(() => toast.error("Profil PIC belum dapat dimuat."));
  }, []);

  function update(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await createSchedule({
        data: { ...form, total_budget: Number(form.total_budget) },
        params: { actor_role: "Koordinator", coordinator_profile_id: "coord-jabar" },
      });
      toast.success("Rencana perjalanan dibuat dan PIC telah ditugaskan.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rencana perjalanan belum dapat dibuat.");
    }
  }

  return <form className="form-panel" onSubmit={submit} data-testid="coordinator-schedule-form">
    <div className="form-section">
      <p className="eyebrow">KOORDINATOR / RENCANA PERJALANAN</p>
      <h2>Tentukan jadwal, wilayah, dan PIC</h2>
      <div className="form-grid">
        {[["title", "Nama STO"], ["region", "Wilayah"], ["branch", "Cabang tujuan"], ["departure_city", "Kota keberangkatan"], ["start_date", "Tanggal mulai", "date"], ["end_date", "Tanggal selesai", "date"], ["total_budget", "Total anggaran (IDR)", "number"]].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type || "text"} value={form[name]} onChange={update} data-testid={`schedule-${name}-input`} /></label>)}
        <label>PIC Accounting<select name="pic_profile_id" value={form.pic_profile_id} onChange={update} data-testid="schedule-pic-profile-select">{profiles.map((profile) => <option key={profile.profile_id} value={profile.profile_id} label={`${profile.name} · ${profile.email}`} />)}</select></label>
      </div>
    </div>
    <button className="primary-button" type="submit" data-testid="create-sto-schedule-button"><CalendarPlus size={18} weight="bold" /> Tugaskan PIC</button>
  </form>;
}