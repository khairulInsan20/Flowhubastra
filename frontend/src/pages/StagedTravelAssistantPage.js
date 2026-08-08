import { useEffect, useMemo, useState } from "react";
import { Bed, Car, Sparkle, Ticket } from "@phosphor-icons/react";
import { toast } from "sonner";
import { useOutletContext } from "react-router-dom";
import { getTrips } from "@/api";
import AccessDenied from "@/components/AccessDenied";

const defaultLegs = [
  ["home-hub", "Rumah → bandara / terminal / stasiun"],
  ["hub-branch", "Bandara / terminal / stasiun → cabang"],
  ["branch-branch", "Cabang 1 → cabang 2"],
  ["branch-hotel", "Cabang → hotel"],
  ["hotel-hub", "Hotel → bandara / terminal / stasiun"],
];

const legPurposes = {
  "home-hub": "Keberangkatan dari tempat tinggal ke hub perjalanan",
  "hub-branch": "Kedatangan dari hub perjalanan ke cabang STO",
  "branch-branch": "Perpindahan antar cabang STO pada hari yang sama",
  "branch-hotel": "Perjalanan dari cabang STO ke penginapan",
  "hotel-hub": "Kepulangan dari penginapan ke hub perjalanan",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function StagedTravelAssistantPage() {
  const { role, profileId } = useOutletContext();
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");
  const [ticketPlan, setTicketPlan] = useState("");
  const [hotelPlan, setHotelPlan] = useState("");
  const [transportPlan, setTransportPlan] = useState("");
  const [finalPlan, setFinalPlan] = useState("");
  const [selectedTicket, setSelectedTicket] = useState("");
  const [selectedHotel, setSelectedHotel] = useState("");
  const [selectedTransport, setSelectedTransport] = useState("");
  const [selectedLegs, setSelectedLegs] = useState(["home-hub", "hub-branch", "branch-hotel", "hotel-hub"]);
  const [loadingStage, setLoadingStage] = useState("");
  const selectedTrip = useMemo(() => trips.find((trip) => trip.id === tripId), [trips, tripId]);
  const branchVisits = useMemo(() => selectedTrip?.branch_visits || (selectedTrip ? [{
    visit_date: selectedTrip.start_date,
    branch_name: selectedTrip.branch,
  }] : []), [selectedTrip]);

  useEffect(() => {
    getTrips().then((items) => {
      const assigned = items.filter((trip) => trip.assigned_pic_id === profileId || !trip.assigned_pic_id);
      setTrips(assigned);
      if (assigned[0]) setTripId(assigned[0].id);
    }).catch(() => toast.error("Rencana STO belum dapat dimuat."));
  }, [profileId]);

  if (role !== "PIC Accounting") {
    return <AccessDenied feature="AI Travel Assistant" roles="PIC Accounting" />;
  }

  async function runStage(stage) {
    if (!selectedTrip) return toast.error("Pilih rencana STO terlebih dahulu.");
    if (stage === "hotel" && !selectedTicket.trim()) return toast.error("Pilih tiket terlebih dahulu.");
    if (stage === "local_transport" && !selectedHotel.trim()) return toast.error("Pilih penginapan terlebih dahulu.");
    if (stage === "local_transport" && !selectedLegs.length) return toast.error("Pilih minimal satu rute transport lokal.");
    setLoadingStage(stage);
    const setOutput = stage === "ticket" ? setTicketPlan : stage === "hotel" ? setHotelPlan : setTransportPlan;
    setOutput("");
    const legs = defaultLegs.filter(([id]) => selectedLegs.includes(id)).map(([id, route]) => ({
      route,
      purpose: legPurposes[id],
    }));
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/travel-recommendations/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage,
          origin: selectedTrip.departure_city,
          total_budget: selectedTrip.total_budget,
          branch_visits: branchVisits,
          preference: "Utamakan tiba sebelum jam kerja dan efisiensi biaya STO.",
          selected_ticket: selectedTicket,
          selected_hotel: selectedHotel,
          selected_transport: selectedTransport,
          transport_legs: legs,
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
          const data = block.match(/^data: (.+)$/m)?.[1];
          if (!data || block.includes("event: error")) return;
          try {
            const parsed = JSON.parse(data);
            setOutput((current) => current + (parsed.delta || ""));
          } catch (error) {
            console.error("AI recommendation chunk could not be parsed", error);
          }
        });
      }
    } catch (error) {
      toast.error("AI belum dapat memberi rekomendasi. Silakan coba lagi.");
    } finally {
      setLoadingStage("");
    }
  }

  async function runFinalPlan() {
    if (!transportPlan || !selectedTransport.trim()) return toast.error("Pilih transport lokal terlebih dahulu.");
    setLoadingStage("final");
    setFinalPlan("");
    const legs = defaultLegs.filter(([id]) => selectedLegs.includes(id)).map(([id, route]) => ({ route, purpose: legPurposes[id] }));
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/ai/final-itinerary/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "local_transport", origin: selectedTrip.departure_city, total_budget: selectedTrip.total_budget, branch_visits: branchVisits, preference: "Efisien dan sesuai jadwal", selected_ticket: selectedTicket, selected_hotel: selectedHotel, selected_transport: selectedTransport, transport_legs: legs }),
      });
      const reader = response.body?.getReader();
      if (!response.ok || !reader) throw new Error("Final plan failed");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";
        blocks.forEach((block) => {
          const data = block.match(/^data: (.+)$/m)?.[1];
          if (!data || block.includes("event: error")) return;
          try { setFinalPlan((current) => current + (JSON.parse(data).delta || "")); } catch (error) { console.error(error); }
        });
      }
    } catch (error) { toast.error("Itinerary akhir belum dapat dibuat."); } finally { setLoadingStage(""); }
  }

  function toggleLeg(id) {
    setSelectedLegs((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return <section className="page-content" data-testid="staged-ai-travel-page">
    <div className="page-heading"><div><p className="eyebrow">PIC ACCOUNTING / AI TRAVEL ASSISTANT</p><h1 data-testid="staged-ai-title">Rencanakan perjalanan per tahap</h1><p data-testid="staged-ai-description">Gemini Search memberi rekomendasi per tahap; GPT-5.4 menyusun itinerary final.</p></div><span className="connection-chip ai-connected-chip" data-testid="staged-ai-model-status"><Sparkle size={16} weight="fill" /> Gemini Search + GPT-5.4</span></div>
    <section className="form-panel" data-testid="coordinator-trip-context-panel"><div className="form-section"><p className="eyebrow">KONTEKS DARI KOORDINATOR</p><h2>Rencana STO & anggaran</h2><div className="form-grid"><label>Rencana STO<select value={tripId} onChange={(event) => setTripId(event.target.value)} data-testid="ai-assigned-trip-select">{trips.map((trip) => <option key={trip.id} value={trip.id} label={`${trip.title} · ${trip.branch}`} />)}</select></label><label>Budget STO (ditetapkan Koordinator)<input value={formatCurrency(selectedTrip?.total_budget)} readOnly data-testid="coordinator-budget-readonly" /></label></div><div className="visit-list" data-testid="coordinator-branch-schedule">{branchVisits.map((visit) => <span key={`${visit.visit_date}-${visit.branch_name}`}>{visit.visit_date} · {visit.branch_name}</span>)}</div></div></section>
    <div className="ai-stage-stack">
      <section className="ai-stage-panel" data-testid="ticket-recommendation-stage"><div className="panel-heading"><div><p className="eyebrow">TAHAP 1</p><h2><Ticket size={20} /> Tiket perjalanan</h2></div><span className="estimate-badge">Browsing AI</span></div><p className="muted">AI membandingkan pilihan tiket sesuai jadwal STO dan budget yang telah ditetapkan.</p><button className="primary-button" type="button" onClick={() => runStage("ticket")} disabled={loadingStage === "ticket"} data-testid="browse-ticket-recommendations-button"><Sparkle size={18} weight="fill" /> {loadingStage === "ticket" ? "Mencari tiket..." : "Cari rekomendasi tiket"}</button>{ticketPlan && <><pre className="ai-gpt-output" data-testid="ticket-ai-output">{ticketPlan}</pre><label className="stage-choice-label">Tiket yang Anda pilih dari rekomendasi AI<input value={selectedTicket} onChange={(event) => setSelectedTicket(event.target.value)} placeholder="Tulis pilihan tiket/moda yang dipilih" data-testid="selected-ticket-input" /></label></>}</section>
      <section className="ai-stage-panel" data-testid="hotel-recommendation-stage"><div className="panel-heading"><div><p className="eyebrow">TAHAP 2</p><h2><Bed size={20} /> Penginapan</h2></div><span className="estimate-badge">Setelah tiket</span></div><p className="muted">AI mencari hotel berdasarkan jadwal cabang serta pilihan tiket yang telah Anda tetapkan.</p><button className="primary-button" type="button" onClick={() => runStage("hotel")} disabled={loadingStage === "hotel" || !selectedTicket.trim()} data-testid="browse-hotel-recommendations-button"><Sparkle size={18} weight="fill" /> {loadingStage === "hotel" ? "Mencari hotel..." : "Cari rekomendasi hotel"}</button>{hotelPlan && <><pre className="ai-gpt-output" data-testid="hotel-ai-output">{hotelPlan}</pre><label className="stage-choice-label">Penginapan yang Anda pilih<input value={selectedHotel} onChange={(event) => setSelectedHotel(event.target.value)} placeholder="Tulis hotel yang dipilih" data-testid="selected-hotel-input" /></label></>}</section>
      <section className="ai-stage-panel" data-testid="local-transport-recommendation-stage"><div className="panel-heading"><div><p className="eyebrow">TAHAP 3</p><h2><Car size={20} /> Transport lokal</h2></div><span className="estimate-badge">Setelah hotel</span></div><p className="muted">Tentukan rute yang memang akan digunakan; AI kemudian mencari rekomendasi per rute.</p><div className="transport-leg-list">{defaultLegs.map(([id, label]) => <label key={id} className="transport-leg"><input type="checkbox" checked={selectedLegs.includes(id)} onChange={() => toggleLeg(id)} data-testid={`transport-leg-${id}-checkbox`} />{label}</label>)}</div><button className="primary-button" type="button" onClick={() => runStage("local_transport")} disabled={loadingStage === "local_transport" || !selectedHotel.trim()} data-testid="browse-local-transport-button"><Sparkle size={18} weight="fill" /> {loadingStage === "local_transport" ? "Mencari transport..." : "Cari rekomendasi transport"}</button>{transportPlan && <><pre className="ai-gpt-output" data-testid="transport-ai-output">{transportPlan}</pre><label className="stage-choice-label">Transport lokal yang Anda pilih<input value={selectedTransport} onChange={(event) => setSelectedTransport(event.target.value)} placeholder="Tulis moda atau penyedia transport yang dipilih" data-testid="selected-transport-input" /></label><button className="primary-button" type="button" onClick={runFinalPlan} disabled={loadingStage === "final" || !selectedTransport.trim()} data-testid="generate-final-itinerary-button"><Sparkle size={18} weight="fill" /> {loadingStage === "final" ? "Menyusun itinerary..." : "Susun itinerary akhir GPT-5.4"}</button>{finalPlan && <pre className="ai-gpt-output" data-testid="final-itinerary-output">{finalPlan}</pre>}</>}</section>
    </div>
  </section>;
}