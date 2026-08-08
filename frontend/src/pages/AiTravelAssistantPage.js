import { useMemo, useState } from "react";
import {
  AirplaneTilt,
  Bed,
  CalendarBlank,
  Car,
  CheckCircle,
  Clock,
  MapPin,
  Sparkle,
} from "@phosphor-icons/react";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const airports = [
  { id: "bdo", name: "Husein Sastranegara", code: "BDO", distance: "6,8 km ke cabang", transfer: 75000, reason: "Paling dekat untuk menjaga waktu tiba dan mobilitas selama STO." },
  { id: "kjt", name: "Kertajati International", code: "KJT", distance: "68 km ke cabang", transfer: 190000, reason: "Alternatif saat pilihan penerbangan lebih banyak atau biaya tiket lebih efisien." },
];

const hotels = [
  { id: "harris", name: "HARRIS Hotel & Conventions Ciumbuleuit", distance: "3,1 km dari cabang", nightly: 670000, rating: "4,4/5", reason: "Keseimbangan jarak cabang, area bisnis, dan fasilitas perjalanan dinas." },
  { id: "fave", name: "favehotel Hyper Square", distance: "2,4 km dari cabang", nightly: 440000, rating: "4,1/5", reason: "Alternatif hemat dengan akses cepat menuju cabang." },
];

export default function AiTravelAssistantPage() {
  const { role } = useOutletContext();
  const [plan, setPlan] = useState({
    origin: "Jakarta",
    branch: "Auto2000 Bandung Soekarno Hatta",
    startDate: "2026-04-14",
    endDate: "2026-04-16",
    budget: "4500000",
    note: "Prioritaskan jadwal yang tiba sebelum jam kerja dan hotel dekat cabang.",
  });
  const [stage, setStage] = useState(0);
  const [airportId, setAirportId] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [transportId, setTransportId] = useState("");
  const [aiPlan, setAiPlan] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const totalBudget = Number(plan.budget || 0);
  const selectedAirport = airports.find((airport) => airport.id === airportId);
  const selectedHotel = hotels.find((hotel) => hotel.id === hotelId);
  const localTransport = useMemo(() => [
    { id: "airport-branch", label: `${selectedAirport?.code || "Bandara"} → Cabang`, detail: "Taksi bandara / ride-hailing", estimate: selectedAirport?.transfer || 0 },
    { id: "branch-hotel", label: "Cabang → Hotel", detail: "Ride-hailing standar", estimate: 48000 },
    { id: "hotel-airport", label: `${selectedHotel ? "Hotel" : "Penginapan"} → ${selectedAirport?.code || "Bandara"}`, detail: "Pemesanan kendaraan terjadwal", estimate: selectedAirport?.transfer || 0 },
  ], [selectedAirport, selectedHotel]);
  const selectedTransport = localTransport.find((item) => item.id === transportId);

  if (role !== "PIC Accounting") {
    return <AccessDenied feature="AI Travel Assistant" roles="PIC Accounting" />;
  }

  function update(field, value) {
    setPlan({ ...plan, [field]: value });
  }

  function startAirportAnalysis(event) {
    event.preventDefault();
    setStage(1);
    toast.info("Analisis akan dimulai dari bandara yang paling relevan.");
  }

  function chooseAirport(id) {
    setAirportId(id);
    setStage(2);
  }

  function chooseHotel(id) {
    setHotelId(id);
    setStage(3);
  }

  function chooseTransport(id) {
    setTransportId(id);
    setStage(4);
    toast.info("Keputusan perjalanan siap dikirim ke GPT-5.4.");
  }

  async function generateAiPlan() {
    if (!selectedAirport || !selectedHotel || !selectedTransport) {
      toast.error("Pilih bandara, penginapan, dan transportasi terlebih dahulu.");
      return;
    }
    setAiLoading(true);
    setAiPlan("");
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/travel-plan/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: plan.origin,
          branch: plan.branch,
          start_date: plan.startDate,
          end_date: plan.endDate,
          total_budget: totalBudget,
          preference: plan.note,
          airport_name: selectedAirport.name,
          airport_code: selectedAirport.code,
          airport_distance: selectedAirport.distance,
          airport_transfer: selectedAirport.transfer,
          hotel_name: selectedHotel.name,
          hotel_distance: selectedHotel.distance,
          hotel_nightly: selectedHotel.nightly,
          transport_route: selectedTransport.label,
          transport_mode: selectedTransport.detail,
          transport_estimate: selectedTransport.estimate,
        }),
      });
      if (!response.ok || !response.body) throw new Error("AI request failed");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        blocks.forEach((block) => {
          const eventName = block.match(/^event: (.+)$/m)?.[1] || "message";
          const data = block.match(/^data: (.+)$/m)?.[1];
          if (eventName === "message" && data) {
            const parsed = JSON.parse(data);
            setAiPlan((current) => current + (parsed.delta || ""));
          }
          if (eventName === "error") toast.error(data || "AI belum dapat membuat rekomendasi.");
        });
      }
    } catch (error) {
      toast.error("AI belum dapat membuat rekomendasi. Silakan coba lagi.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <section className="page-content" data-testid="ai-travel-assistant-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">PERENCANAAN CERDAS / PRA-STO</p>
          <h1 data-testid="ai-travel-assistant-title">AI Travel Assistant</h1>
          <p data-testid="ai-travel-assistant-description">AI membuat keputusan berurutan agar rute, tempat menginap, dan mobilitas lokal saling sesuai.</p>
        </div>
        <span className="connection-chip ai-connected-chip" data-testid="ai-connection-status"><Sparkle size={16} weight="fill" /> GPT-5.4 aktif</span>
      </div>

      <div className="ai-stepper" data-testid="ai-decision-stepper">
        {["Bandara", "Penginapan", "Transport lokal", "Review RAB"].map((label, index) => <div className={stage >= index + 1 ? "step-active" : ""} key={label} data-testid={`ai-step-${index + 1}`}><span>{index + 1}</span>{label}</div>)}
      </div>

      <form className="form-panel ai-input-panel" onSubmit={startAirportAnalysis} data-testid="ai-trip-context-form">
        <div className="form-section">
          <p className="eyebrow">KONTEKS PERJALANAN</p>
          <h2>Mulai dari jadwal dan lokasi STO</h2>
          <div className="form-grid ai-form-grid">
            <label>Kota keberangkatan<input value={plan.origin} onChange={(event) => update("origin", event.target.value)} data-testid="ai-origin-input" /></label>
            <label>Cabang tujuan<input value={plan.branch} onChange={(event) => update("branch", event.target.value)} data-testid="ai-branch-input" /></label>
            <label>Tanggal mulai<input type="date" value={plan.startDate} onChange={(event) => update("startDate", event.target.value)} data-testid="ai-start-date-input" /></label>
            <label>Tanggal selesai<input type="date" value={plan.endDate} onChange={(event) => update("endDate", event.target.value)} data-testid="ai-end-date-input" /></label>
            <label>Anggaran total (IDR)<input type="number" value={plan.budget} onChange={(event) => update("budget", event.target.value)} data-testid="ai-total-budget-input" /></label>
          </div>
          <label className="ai-note-label">Preferensi atau batasan perjalanan<textarea value={plan.note} onChange={(event) => update("note", event.target.value)} data-testid="ai-travel-preference-input" /></label>
        </div>
        <button className="primary-button" type="submit" data-testid="start-airport-analysis-button"><Sparkle size={18} weight="fill" /> Analisis bandara</button>
      </form>

      {stage >= 1 && <section className="ai-stage-panel" data-testid="airport-stage-panel">
        <div className="panel-heading"><div><p className="eyebrow">TAHAP 1 / GERBANG PERJALANAN</p><h2>Bandara yang paling sesuai</h2></div><span className="estimate-badge">Urutan pertama</span></div>
        <div className="decision-grid">{airports.map((airport) => <article className={`decision-card ${airportId === airport.id ? "decision-selected" : ""}`} key={airport.id} data-testid={`airport-option-${airport.id}`}><AirplaneTilt size={26} weight="duotone" /><div><span>{airport.code} · {airport.distance}</span><strong>{airport.name}</strong><p>{airport.reason}</p><b>Transfer estimasi {formatter.format(airport.transfer)}</b></div><button className="secondary-button" type="button" onClick={() => chooseAirport(airport.id)} data-testid={`select-airport-${airport.id}`}>{airportId === airport.id ? "Dipilih" : "Pilih bandara"}</button></article>)}</div>
      </section>}

      {stage >= 2 && <section className="ai-stage-panel" data-testid="hotel-stage-panel">
        <div className="panel-heading"><div><p className="eyebrow">TAHAP 2 / TEMPAT MENGINAP</p><h2>Penginapan setelah bandara ditetapkan</h2></div><span className="estimate-badge">Menimbang {selectedAirport?.code}</span></div>
        <div className="decision-grid">{hotels.map((hotel) => <article className={`decision-card ${hotelId === hotel.id ? "decision-selected" : ""}`} key={hotel.id} data-testid={`hotel-option-${hotel.id}`}><Bed size={26} weight="duotone" /><div><span>{hotel.rating} · {hotel.distance}</span><strong>{hotel.name}</strong><p>{hotel.reason}</p><b>{formatter.format(hotel.nightly)} / malam</b></div><button className="secondary-button" type="button" onClick={() => chooseHotel(hotel.id)} data-testid={`select-hotel-${hotel.id}`}>{hotelId === hotel.id ? "Dipilih" : "Pilih hotel"}</button></article>)}</div>
      </section>}

      {stage >= 3 && <section className="ai-stage-panel" data-testid="local-transport-stage-panel">
        <div className="panel-heading"><div><p className="eyebrow">TAHAP 3 / MOBILITAS LOKAL</p><h2>Rute transportasi yang terdekat</h2></div><span className="estimate-badge">Berdasar rute terpilih</span></div>
        <div className="transport-grid">{localTransport.map((route) => <button type="button" className={`transport-card ${transportId === route.id ? "transport-selected" : ""}`} key={route.id} onClick={() => chooseTransport(route.id)} data-testid={`select-transport-${route.id}`}><Car size={22} weight="duotone" /><span>{route.detail}</span><strong>{route.label}</strong><b>{formatter.format(route.estimate)}</b></button>)}</div>
      </section>}

      {stage === 4 && <section className="ai-review-panel" data-testid="ai-trip-review-panel"><CheckCircle size={28} weight="fill" /><div><p className="eyebrow">TAHAP 4 / SIAP DIREVIEW</p><h2>Rencana keputusan berurutan telah terbentuk</h2><p data-testid="ai-trip-review-summary">{selectedAirport?.name}, {selectedHotel?.name}, dan rute {selectedTransport?.label} menjadi konteks GPT-5.4 untuk itinerary lengkap, estimasi total, serta alternatif hemat.</p><button className="primary-button ai-generate-button" type="button" onClick={generateAiPlan} disabled={aiLoading} data-testid="generate-gpt-plan-button"><Sparkle size={18} weight="fill" /> {aiLoading ? "Menyusun itinerary..." : "Buat itinerary dengan GPT-5.4"}</button>{aiPlan && <div className="ai-gpt-output" data-testid="gpt-travel-plan-output">{aiPlan}</div>}</div><div className="ai-review-budget"><Clock size={18} /><span>Budget target</span><strong>{formatter.format(totalBudget)}</strong></div></section>}
    </section>
  );
}