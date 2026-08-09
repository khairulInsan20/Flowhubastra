import { useEffect, useMemo, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getTrips, setAllocation, submitTrip } from "@/api";
import BudgetBar from "@/components/BudgetBar";

export default function PicAllocationPanel({ profileId }) {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [allocations, setAllocations] = useState([{ category: "Tiket", percentage: 30 }, { category: "Hotel", percentage: 45 }, { category: "Transport lokal", percentage: 25 }]);
  const total = useMemo(() => allocations.reduce((sum, item) => sum + Number(item.percentage), 0), [allocations]);
  const assignedTrips = trips.filter((trip) => trip.assigned_pic_id === profileId && ["DRAF ALOKASI PIC", "PERLU REVISI"].includes(trip.status));

  function load() {
    getTrips().then((items) => {
      setTrips(items);
      const first = items.find((trip) => trip.assigned_pic_id === profileId && ["DRAF ALOKASI PIC", "PERLU REVISI"].includes(trip.status));
      if (first) setTripId(first.id);
    });
  }

  useEffect(() => { load(); }, [profileId]);

  function updateAllocation(index, value) {
    setAllocations(allocations.map((item, current) => current === index ? { ...item, percentage: Number(value) } : item));
  }

  async function saveAndSubmit() {
    if (!tripId) return toast.error("Belum ada STO yang ditugaskan untuk alokasi.");
    if (total !== 100) return toast.error("Total proporsi harus tepat 100%.");
    try {
      await setAllocation(tripId, { actor_role: "PIC Accounting", pic_profile_id: profileId, allocations });
      await submitTrip(tripId, profileId);
      toast.success("Alokasi RAB dikirim ke Koordinator.");
      load();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Alokasi belum dapat dikirim.");
    }
  }

  return <section className="allocation-panel" data-testid="pic-allocation-panel">
    <p className="eyebrow">PIC ACCOUNTING / RENCANA ALOKASI</p>
    <h2>Tentukan proporsi anggaran</h2>
    <label className="allocation-trip-label">STO yang ditugaskan<select value={tripId} onChange={(event) => setTripId(event.target.value)} data-testid="assigned-trip-select"><option value="">Pilih rencana STO</option>{assignedTrips.map((trip) => <option key={trip.id} value={trip.id} label={`${trip.title} · ${trip.branch}`} />)}</select></label>
    <p className="muted" data-testid="pic-profile-autofill">Profil PIC: Khairul Insan Al Amin · Khairul.insan@ai.astra.co.id · 08882856395</p>
    {allocations.map((item, index) => <label className="allocation-control" key={item.category}>{item.category}<div><input type="range" min="0" max="100" value={item.percentage} onChange={(event) => updateAllocation(index, event.target.value)} data-testid={`pic-allocation-${item.category.toLowerCase().replaceAll(" ", "-")}-range`} /><output data-testid={`pic-allocation-${item.category.toLowerCase().replaceAll(" ", "-")}-value`}>{item.percentage}%</output></div></label>)}
    <BudgetBar allocations={allocations} />
    <p className="muted" data-testid="pic-allocation-total">Total proporsi: {total}%</p>
    <button className="primary-button submit-button" type="button" onClick={saveAndSubmit} data-testid="submit-pic-allocation-button"><PaperPlaneTilt size={18} weight="bold" /> Kirim RAB</button>
  </section>;
}
