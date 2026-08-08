import { useMemo, useState } from "react";
import { Bed, Car, CheckCircle, Ticket } from "@phosphor-icons/react";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

const tickets = [
  { id: "ka", label: "Kereta Argo Parahyangan", route: "Jakarta → Bandung", price: 220000, note: "Keberangkatan pagi, estimasi 3 jam" },
  { id: "bus", label: "Bus antarkota eksekutif", route: "Jakarta → Bandung", price: 145000, note: "Keberangkatan malam, estimasi 4–5 jam" },
  { id: "flight", label: "Penerbangan kota terdekat", route: "Jakarta → Kertajati", price: 720000, note: "Pertimbangkan transfer lanjutan ke kota STO" },
];
const hotels = [
  { id: "business", label: "Hotel bisnis dekat cabang", price: 670000, note: "Sarapan dan akses 3 km dari cabang" },
  { id: "value", label: "Hotel value dekat cabang", price: 440000, note: "Alternatif hemat dengan akses 2,4 km" },
  { id: "premium", label: "Hotel rapat & bisnis", price: 820000, note: "Fasilitas kerja dan fleksibilitas check-in" },
];
const legs = [
  ["home", "Rumah → bandara / terminal / stasiun", 85000],
  ["arrival", "Bandara / terminal / stasiun → cabang", 120000],
  ["branch", "Cabang 1 → cabang 2", 70000],
  ["hotel", "Cabang → hotel", 48000],
  ["return", "Hotel → bandara / terminal / stasiun", 120000],
];

export default function ManualTravelPlannerPage() {
  const { role } = useOutletContext();
  const [ticketId, setTicketId] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [transport, setTransport] = useState({});
  const [review, setReview] = useState(false);
  const [prices, setPrices] = useState({});
  const ticket = tickets.find((item) => item.id === ticketId);
  const hotel = hotels.find((item) => item.id === hotelId);
  const transportItems = legs.filter(([id]) => transport[id]).map(([id, label, price]) => ({ id, label, price }));
  const total = useMemo(() => (ticket ? Number(prices.ticket || ticket.price) : 0) + (hotel ? Number(prices.hotel || hotel.price) : 0) + transportItems.reduce((sum, item) => sum + Number(prices[item.id] || item.price), 0), [ticket, hotel, transportItems, prices]);
  if (role !== "PIC Accounting") return <AccessDenied feature="Travel Assistant" roles="PIC Accounting" />;
  return <section className="page-content" data-testid="manual-travel-planner-page"><div className="page-heading"><div><p className="eyebrow">PIC ACCOUNTING / FLOWHUB</p><h1 data-testid="manual-travel-title">Pilih kebutuhan perjalanan STO</h1><p>Bandingkan pilihan di aplikasi perjalanan, lalu pilih dan sesuaikan nilai aktual sebelum mengirim RAB.</p></div></div><div className="ai-stage-stack"><section className="ai-stage-panel" data-testid="ticket-choice-stage"><h2><Ticket size={20} /> 1. Tiket ke kota STO</h2><div className="decision-grid">{tickets.map((item) => <button className={`transport-card ${ticketId === item.id ? "transport-selected" : ""}`} key={item.id} onClick={() => setTicketId(item.id)} data-testid={`ticket-option-${item.id}`}><span>{item.route}</span><strong>{item.label}</strong><p>{item.note}</p><b>Rp{item.price.toLocaleString("id-ID")}</b></button>)}</div></section>{ticket && <section className="ai-stage-panel" data-testid="hotel-choice-stage"><h2><Bed size={20} /> 2. Penginapan</h2><div className="decision-grid">{hotels.map((item) => <button className={`transport-card ${hotelId === item.id ? "transport-selected" : ""}`} key={item.id} onClick={() => setHotelId(item.id)} data-testid={`hotel-option-${item.id}`}><span>Estimasi per malam</span><strong>{item.label}</strong><p>{item.note}</p><b>Rp{item.price.toLocaleString("id-ID")}</b></button>)}</div></section>}{hotel && <section className="ai-stage-panel" data-testid="transport-choice-stage"><h2><Car size={20} /> 3. Transport lokal yang diperlukan</h2><div className="transport-leg-list">{legs.map(([id, label, price]) => <label className="transport-leg" key={id}><input type="checkbox" checked={Boolean(transport[id])} onChange={(event) => setTransport({ ...transport, [id]: event.target.checked })} data-testid={`manual-transport-${id}-checkbox`} />{label} · Rp{price.toLocaleString("id-ID")}</label>)}</div><button className="primary-button" type="button" onClick={() => setReview(true)} disabled={!transportItems.length} data-testid="open-travel-review-button">Lanjut ke review</button></section>}{review && <section className="ai-stage-panel" data-testid="travel-review-stage"><h2><CheckCircle size={20} /> Review harga & bukti</h2><p className="muted">Nilai dapat diubah sesuai kondisi yang benar-benar Anda temukan di aplikasi penyedia.</p><div className="review-price-grid"><label>Tiket<input type="number" value={prices.ticket ?? ticket.price} onChange={(event) => setPrices({ ...prices, ticket: event.target.value })} data-testid="review-ticket-price-input" /><input type="file" data-testid="ticket-price-proof-input" /></label><label>Hotel<input type="number" value={prices.hotel ?? hotel.price} onChange={(event) => setPrices({ ...prices, hotel: event.target.value })} data-testid="review-hotel-price-input" /><input type="file" data-testid="hotel-price-proof-input" /></label>{transportItems.map((item) => <label key={item.id}>{item.label}<input type="number" value={prices[item.id] ?? item.price} onChange={(event) => setPrices({ ...prices, [item.id]: event.target.value })} data-testid={`review-transport-${item.id}-price-input`} /><input type="file" data-testid={`transport-${item.id}-proof-input`} /></label>)}</div><div className="budget-total"><span>Total rencana</span><strong>Rp{total.toLocaleString("id-ID")}</strong></div><button className="primary-button" type="button" data-testid="submit-travel-review-button">Kirim RAB untuk approval</button></section>}</div></section>;
}