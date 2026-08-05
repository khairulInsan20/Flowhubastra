import { useEffect, useState } from "react";
import { CheckCircle, Ticket } from "@phosphor-icons/react";
import { toast } from "sonner";
import { confirmBooking, getTrips } from "@/api";
import { useOutletContext } from "react-router-dom";

export default function InboxPage() {
  const { role } = useOutletContext();
  const [trips, setTrips] = useState([]);
  const load = () => getTrips().then(setTrips).catch(() => toast.error("Inbox belum dapat dimuat."));
  useEffect(() => { load(); }, []);
  async function book(tripId) {
    try {
      await confirmBooking(tripId, { actor_role: role, flight_reference: "KA ARGO PARAHYANGAN / 14 APR", hotel_reference: "HOTEL BISNIS BANDUNG / 2 MALAM", note: "Pemesanan demonstrasi telah dikonfirmasi." });
      toast.success("Konfirmasi pemesanan masuk ke inbox PIC.");
      load();
    } catch (error) { toast.error(error.response?.data?.detail || "Pemesanan belum dapat dikonfirmasi."); }
  }
  const needsBooking = trips.filter((trip) => trip.status === "MENUNGGU PEMESANAN");
  const booked = trips.filter((trip) => trip.booking);
  return <section className="page-content" data-testid="booking-inbox-page"><div className="page-heading"><div><p className="eyebrow">SEKRETARIS DIVISI / PIC ACCOUNTING</p><h1 data-testid="booking-inbox-title">Inbox pemesanan</h1><p data-testid="booking-inbox-role-note">Mode aktif: {role}. Konfirmasi tersedia setelah Manager menyetujui RAB.</p></div></div><div className="section-grid"><section className="data-panel" data-testid="booking-queue-panel"><div className="panel-heading"><div><p className="eyebrow">PERLU DIPESANKAN</p><h2>{needsBooking.length} rencana siap dipesan</h2></div></div>{needsBooking.map((trip) => <article className="approval-row" key={trip.id} data-testid={`booking-trip-${trip.id}`}><div><strong>{trip.title}</strong><span>{trip.branch} · Anggaran Rp{trip.total_budget.toLocaleString("id-ID")}</span></div><button type="button" className="primary-button" onClick={() => book(trip.id)} data-testid={`confirm-booking-${trip.id}`}><Ticket size={18} weight="bold" /> Konfirmasi pemesanan</button></article>)}{!needsBooking.length && <p className="empty-state" data-testid="booking-empty-state">Belum ada RAB yang siap dipesankan.</p>}</section><section className="data-panel" data-testid="confirmed-booking-panel"><div className="panel-heading"><div><p className="eyebrow">MASUK KE PIC</p><h2>Tiket & hotel terkonfirmasi</h2></div></div>{booked.map((trip) => <article className="inbox-item" key={trip.id} data-testid={`confirmed-booking-${trip.id}`}><CheckCircle size={24} weight="fill" /><div><strong>{trip.title}</strong><span>{trip.booking.flight_reference}</span><span>{trip.booking.hotel_reference}</span></div></article>)}{!booked.length && <p className="empty-state" data-testid="confirmed-booking-empty-state">Konfirmasi pemesanan akan tampil di sini.</p>}</section></div></section>;
}