import { useEffect, useState } from "react";
import { PaperPlaneTilt, Receipt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getTrips, submitRealization } from "@/api";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function RealizationPage() {
  const { role } = useOutletContext();
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [form, setForm] = useState({ description: "Transportasi lokal cabang ke hotel", amount: "280000", account: "BCA 1234567890 a.n. Nadia Pratama", rating: "4", note: "Jadwal perjalanan dan hotel mendukung pelaksanaan STO dengan baik." });
  const load = () => getTrips().then((items) => { setTrips(items); if (!tripId && items.length) setTripId(items[0].id); });
  useEffect(() => { load(); }, []);
  if (role !== "PIC Accounting") {
    return <AccessDenied feature="Realisasi & reimbursement" roles="PIC Accounting" />;
  }
  const selected = trips.find((trip) => trip.id === tripId);
  async function send(event) {
    event.preventDefault();
    try {
      await submitRealization(tripId, { actor_role: role, expenses: [{ category: "Transport lokal", description: form.description, amount: Number(form.amount), proof_name: "bukti_transport.pdf" }], reimbursement_account: form.account, survey_rating: Number(form.rating), survey_note: form.note });
      toast.success("Realisasi dan survei dikirim untuk verifikasi.");
      load();
    } catch (error) { toast.error(error.response?.data?.detail || "Realisasi belum dapat dikirim."); }
  }
  return <section className="page-content" data-testid="realization-page"><div className="page-heading"><div><p className="eyebrow">PASCA-STO / PIC ACCOUNTING</p><h1 data-testid="realization-title">Realisasi & reimbursement</h1><p data-testid="realization-description">Catat pengeluaran di luar tiket dan hotel, unggah bukti, lalu lengkapi rekening dan survei.</p></div></div><div className="plan-grid"><form className="form-panel" onSubmit={send} data-testid="realization-form"><div className="form-section"><h2>Pengeluaran aktual</h2><label>Rencana STO<select value={tripId} onChange={(event) => setTripId(event.target.value)} data-testid="realization-trip-select">{trips.map((trip) => <option key={trip.id} value={trip.id} label={`${trip.title} — ${trip.status}`} />)}</select></label><label>Rincian pengeluaran<input value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} data-testid="actual-expense-description-input" /></label><label>Nilai aktual (IDR)<input type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} data-testid="actual-expense-amount-input" /></label><label>Bukti pengeluaran<input type="file" data-testid="actual-proof-file-input" /></label></div><div className="form-section"><h2>Reimbursement & survei</h2><label>Rekening pengembalian<input value={form.account} onChange={(event) => setForm({ ...form, account: event.target.value })} data-testid="reimbursement-account-input" /></label><label>Penilaian perjalanan<select value={form.rating} onChange={(event) => setForm({ ...form, rating: event.target.value })} data-testid="travel-survey-rating-select"><option value="1">1 dari 5</option><option value="2">2 dari 5</option><option value="3">3 dari 5</option><option value="4">4 dari 5</option><option value="5">5 dari 5</option></select></label><label>Catatan survei<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} data-testid="travel-survey-note-input" /></label></div><button className="primary-button" type="submit" data-testid="submit-realization-button"><PaperPlaneTilt size={18} weight="bold" /> Kirim realisasi</button></form><aside className="allocation-panel" data-testid="realization-status-panel"><Receipt size={32} weight="duotone" /><p className="eyebrow">STATUS PELAPORAN</p><h2>{selected?.status || "Pilih rencana"}</h2><p className="muted" data-testid="realization-status-detail">Realisasi dapat dikirim setelah tiket dan hotel dikonfirmasi oleh Sekretaris Divisi.</p><div className="completion-meter"><span>Checklist kelengkapan</span><strong>{selected?.realization ? "100%" : "40%"}</strong><div><i style={{ width: selected?.realization ? "100%" : "40%" }} /></div></div></aside></div></section>;
}