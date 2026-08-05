import { useMemo, useState } from "react";
import { FileArrowUp, MagicWand, PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { addAttachment, createTrip, getRecommendations, submitTrip } from "@/api";
import BudgetBar from "@/components/BudgetBar";

const initialForm = {
  title: "STO Part & Bahan Bandung",
  region: "Jawa Barat",
  branch: "Auto2000 Bandung Soekarno Hatta",
  departure_city: "Jakarta",
  start_date: "2026-04-14",
  end_date: "2026-04-16",
  total_budget: "4500000",
  traveler_name: "Nadia Pratama",
  traveler_phone: "081234567890",
};

export default function PlanPage() {
  const [form, setForm] = useState(initialForm);
  const [allocations, setAllocations] = useState([{ category: "Tiket", percentage: 30 }, { category: "Hotel", percentage: 45 }, { category: "Transport lokal", percentage: 25 }]);
  const [recommendations, setRecommendations] = useState([]);
  const [trip, setTrip] = useState(null);
  const [fileName, setFileName] = useState("");
  const totalPercentage = useMemo(() => allocations.reduce((sum, item) => sum + Number(item.percentage), 0), [allocations]);

  const updateForm = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const updateAllocation = (index, value) => setAllocations(allocations.map((item, current) => current === index ? { ...item, percentage: Number(value) } : item));

  async function loadRecommendations() {
    try {
      const response = await getRecommendations({ origin: form.departure_city, destination: form.branch, budget: Number(form.total_budget) });
      setRecommendations(response.items);
      toast.success("Rekomendasi estimasi telah disiapkan.");
    } catch (error) {
      toast.error("Rekomendasi belum dapat dimuat.");
    }
  }

  async function saveTrip() {
    if (totalPercentage !== 100) {
      toast.error("Total proporsi harus tepat 100%.");
      return;
    }
    try {
      const created = await createTrip({ ...form, total_budget: Number(form.total_budget), allocations });
      setTrip(created);
      toast.success("Draf RAB STO berhasil disimpan.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "RAB belum dapat disimpan.");
    }
  }

  async function attachFile() {
    if (!trip || !fileName) {
      toast.error("Simpan draf dan pilih berkas bukti terlebih dahulu.");
      return;
    }
    await addAttachment(trip.id, { actor_role: "PIC Accounting", file_name: fileName, evidence_type: "Benchmarking harga" });
    toast.success("Metadata lampiran bukti telah ditambahkan.");
  }

  async function sendForReview() {
    if (!trip) {
      toast.error("Simpan draf RAB terlebih dahulu.");
      return;
    }
    await submitTrip(trip.id);
    toast.success("RAB dikirim ke Koordinator.");
  }

  return <section className="page-content" data-testid="trip-plan-page">
    <div className="page-heading"><div><p className="eyebrow">PRA-STO / PIC ACCOUNTING</p><h1 data-testid="trip-plan-title">Rencana STO & RAB fleksibel</h1><p data-testid="trip-plan-description">Tetapkan total, lalu sesuaikan proporsi perjalanan dengan kondisi yang Anda hadapi.</p></div></div>
    <div className="plan-grid">
      <form className="form-panel" onSubmit={(event) => { event.preventDefault(); saveTrip(); }} data-testid="trip-plan-form">
        <div className="form-section"><h2>Rencana perjalanan</h2><div className="form-grid">
          {[["title", "Nama STO"], ["region", "Wilayah"], ["branch", "Cabang tujuan"], ["departure_city", "Kota keberangkatan"], ["start_date", "Mulai", "date"], ["end_date", "Selesai", "date"], ["traveler_name", "Nama PIC"], ["traveler_phone", "Nomor telepon"]].map(([name, label, type]) => <label key={name}>{label}<input name={name} type={type || "text"} value={form[name]} onChange={updateForm} data-testid={`trip-plan-${name}-input`} /></label>)}
        </div></div>
        <div className="form-section"><h2>Anggaran total</h2><label>Total anggaran (IDR)<input name="total_budget" type="number" value={form.total_budget} onChange={updateForm} data-testid="trip-plan-total-budget-input" /></label></div>
        <button className="primary-button" type="submit" data-testid="save-trip-plan-button">Simpan draf RAB</button>
      </form>
      <aside className="allocation-panel" data-testid="budget-allocation-panel">
        <p className="eyebrow">PROPORSI PENGELUARAN</p><h2>Rancang alokasi</h2><p className="muted" data-testid="allocation-total-label">Total: {totalPercentage}%</p>
        {allocations.map((item, index) => <label className="allocation-control" key={item.category}>{item.category}<div><input type="range" min="0" max="100" value={item.percentage} onChange={(event) => updateAllocation(index, event.target.value)} data-testid={`allocation-${item.category.toLowerCase().replaceAll(" ", "-")}-range`} /><output data-testid={`allocation-${item.category.toLowerCase().replaceAll(" ", "-")}-value`}>{item.percentage}%</output></div></label>)}
        <BudgetBar allocations={allocations} />
        <button className="secondary-button" type="button" onClick={loadRecommendations} data-testid="load-travel-recommendations-button"><MagicWand size={18} weight="bold" /> Rekomendasi estimasi</button>
        <div className="file-metadata"><label htmlFor="benchmark-file">Bukti benchmarking</label><input id="benchmark-file" type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name || "")} data-testid="benchmark-file-input" /><button className="text-button" type="button" onClick={attachFile} data-testid="attach-benchmark-button"><FileArrowUp size={18} /> Tambahkan bukti</button></div>
        <button className="primary-button submit-button" type="button" onClick={sendForReview} data-testid="submit-rab-button"><PaperPlaneTilt size={18} weight="bold" /> Kirim untuk review</button>
      </aside>
    </div>
    {recommendations.length > 0 && <section className="recommendation-panel" data-testid="travel-recommendations-panel"><div className="panel-heading"><div><p className="eyebrow">PERENCANAAN AKOMODASI</p><h2>Rekomendasi estimasi</h2></div><span className="estimate-badge" data-testid="estimate-disclaimer">Bukan harga live</span></div><div className="recommendation-grid">{recommendations.map((item) => <article key={item.category} data-testid={`recommendation-${item.category.toLowerCase().replaceAll(" ", "-")}`}><span>{item.category}</span><strong>{item.title}</strong><p>{item.note}</p><b>Rp{item.estimate.toLocaleString("id-ID")}</b></article>)}</div></section>}
  </section>;
}