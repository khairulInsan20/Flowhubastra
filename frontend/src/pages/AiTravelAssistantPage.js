import { useMemo, useState } from "react";
import {
  AirplaneTilt,
  Bed,
  CalendarBlank,
  Car,
  LockKey,
  MapPin,
  Sparkle,
  Train,
} from "@phosphor-icons/react";
import { toast } from "sonner";

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function AiTravelAssistantPage() {
  const [plan, setPlan] = useState({
    origin: "Jakarta",
    branch: "Auto2000 Bandung Soekarno Hatta",
    startDate: "2026-04-14",
    endDate: "2026-04-16",
    budget: "4500000",
    note: "Prioritaskan jadwal yang tiba sebelum jam kerja dan hotel dekat cabang.",
  });
  const totalBudget = Number(plan.budget || 0);
  const previewItems = useMemo(() => [
    { icon: Train, category: "Pergi & pulang", title: `${plan.origin} ↔ Bandung`, amount: Math.round(totalBudget * 0.3), detail: "Moda dipilih berdasarkan waktu tiba, durasi, dan batas anggaran." },
    { icon: Bed, category: "Akomodasi", title: "Hotel bisnis dekat cabang", amount: Math.round(totalBudget * 0.45), detail: "Pilihan mengutamakan jarak cabang dan kebutuhan perjalanan dinas." },
    { icon: Car, category: "Mobilitas lokal", title: "Stasiun/bandara, cabang, dan hotel", amount: Math.round(totalBudget * 0.25), detail: "Termasuk seluruh rute perusahaan selama jadwal STO." },
  ], [plan.origin, totalBudget]);

  function update(field, value) {
    setPlan({ ...plan, [field]: value });
  }

  function explainConnection() {
    toast.info("AI Travel Assistant akan aktif setelah OpenAI API key dihubungkan.");
  }

  return (
    <section className="page-content" data-testid="ai-travel-assistant-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERENCANAAN CERDAS / PRA-STO</p>
          <h1 data-testid="ai-travel-assistant-title">AI Travel Assistant</h1>
          <p data-testid="ai-travel-assistant-description">Siapkan konteks trip agar AI dapat menyusun itinerary, estimasi biaya, dan alternatif hemat yang dapat Anda review.</p>
        </div>
        <span className="connection-chip" data-testid="ai-connection-status"><LockKey size={16} weight="bold" /> Menunggu koneksi OpenAI</span>
      </div>

      <div className="ai-layout">
        <form className="form-panel ai-input-panel" onSubmit={(event) => { event.preventDefault(); explainConnection(); }} data-testid="ai-trip-context-form">
          <div className="form-section">
            <p className="eyebrow">KONTEKS PERJALANAN</p>
            <h2>Data yang akan dibaca AI</h2>
            <div className="form-grid ai-form-grid">
              <label>Kota keberangkatan<input value={plan.origin} onChange={(event) => update("origin", event.target.value)} data-testid="ai-origin-input" /></label>
              <label>Cabang tujuan<input value={plan.branch} onChange={(event) => update("branch", event.target.value)} data-testid="ai-branch-input" /></label>
              <label>Tanggal mulai<input type="date" value={plan.startDate} onChange={(event) => update("startDate", event.target.value)} data-testid="ai-start-date-input" /></label>
              <label>Tanggal selesai<input type="date" value={plan.endDate} onChange={(event) => update("endDate", event.target.value)} data-testid="ai-end-date-input" /></label>
              <label>Anggaran total (IDR)<input type="number" value={plan.budget} onChange={(event) => update("budget", event.target.value)} data-testid="ai-total-budget-input" /></label>
            </div>
            <label className="ai-note-label">Preferensi atau batasan perjalanan<textarea value={plan.note} onChange={(event) => update("note", event.target.value)} data-testid="ai-travel-preference-input" /></label>
          </div>
          <button className="primary-button" type="submit" data-testid="generate-ai-trip-button"><Sparkle size={18} weight="fill" /> Buat rekomendasi AI</button>
        </form>

        <aside className="ai-readiness-panel" data-testid="ai-readiness-panel">
          <Sparkle size={34} weight="duotone" />
          <p className="eyebrow">KELUARAN AI</p>
          <h2>Rencana yang akan dihasilkan</h2>
          <ul>
            <li data-testid="ai-output-itinerary"><CalendarBlank size={18} /> Itinerary pergi, pelaksanaan STO, dan pulang</li>
            <li data-testid="ai-output-transport"><AirplaneTilt size={18} /> Moda perjalanan dengan pertimbangan waktu dan biaya</li>
            <li data-testid="ai-output-hotel"><Bed size={18} /> Hotel yang relevan dengan jarak cabang dan durasi kunjungan</li>
            <li data-testid="ai-output-savings"><MapPin size={18} /> Dua sampai tiga alternatif hemat beserta alasan pemilihannya</li>
          </ul>
          <p className="muted" data-testid="ai-readiness-message">Hasil AI akan selalu meminta review PIC sebelum menjadi RAB.</p>
        </aside>
      </div>

      <section className="ai-preview-panel" data-testid="ai-response-preview-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">PRATINJAU FORMAT JAWABAN</p>
            <h2>Rencana perjalanan yang akan direkomendasikan</h2>
          </div>
          <span className="estimate-badge" data-testid="ai-preview-disclaimer">Menunggu AI terhubung</span>
        </div>
        <div className="ai-itinerary-summary" data-testid="ai-itinerary-summary">
          <div><CalendarBlank size={20} weight="bold" /><span>{plan.startDate} — {plan.endDate}</span></div>
          <div><MapPin size={20} weight="bold" /><span>{plan.origin} → {plan.branch}</span></div>
          <div><Sparkle size={20} weight="fill" /><span>Anggaran target {formatter.format(totalBudget)}</span></div>
        </div>
        <div className="recommendation-grid">
          {previewItems.map((item) => {
            const Icon = item.icon;
            return <article key={item.category} data-testid={`ai-preview-${item.category.toLowerCase().replaceAll(" ", "-").replaceAll("&", "dan")}`}>
              <span><Icon size={15} weight="bold" /> {item.category}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <b>{formatter.format(item.amount)}</b>
            </article>;
          })}
        </div>
      </section>
    </section>
  );
}