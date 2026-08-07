import { useEffect, useState } from "react";
import { CheckCircle, Ticket } from "@phosphor-icons/react";
import { toast } from "sonner";
import { confirmBooking, getNotifications, getTrips } from "@/api";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function InboxPage() {
  const { role, profileId } = useOutletContext();
  const [trips, setTrips] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const load = () => {
    getTrips().then(setTrips).catch(() => toast.error("Inbox belum dapat dimuat."));
    if (role === "PIC Accounting") getNotifications(profileId).then(setNotifications).catch(() => toast.error("Notifikasi belum dapat dimuat."));
  };
  useEffect(() => { load(); }, [role, profileId]);
  if (!["PIC Accounting", "Sekretaris Divisi"].includes(role)) {
    return <AccessDenied feature="Inbox pemesanan" roles="PIC Accounting dan Sekretaris Divisi" />;
  }
  async function book(tripId) {
    try {
      await confirmBooking(tripId, { actor_role: role, flight_reference: "KA ARGO PARAHYANGAN / 14 APR", hotel_reference: "HOTEL BISNIS BANDUNG / 2 MALAM", note: "Pemesanan demonstrasi telah dikonfirmasi." });
      toast.success("Konfirmasi pemesanan masuk ke inbox PIC.");
      load();
    } catch (error) { toast.error(error.response?.data?.detail || "Pemesanan belum dapat dikonfirmasi."); }
  }
  const needsBooking = trips.filter((trip) => trip.status === "MENUNGGU PEMESANAN");
  const booked = trips.filter((trip) => trip.booking && (role === "Sekretaris Divisi" || trip.assigned_pic_id === profileId));
  return <section className="page-content" data-testid="booking-inbox-page"><div className="page-heading"><div><p className="eyebrow">INBOX PEMESANAN</p><h1 data-testid="booking-inbox-title">{role === "Sekretaris Divisi" ? "Daftar pemesanan STO" : "Tiket, hotel, & revisi RAB"}</h1><p data-testid="booking-inbox-role-note">Mode aktif: {role}.</p></div></div><div className="section-grid">{role === "Sekretaris Divisi" && <section className="data-panel" data-testid="booking-queue-panel"><div className="panel-heading"><div><p className="eyebrow">PERLU DIPESANKAN</p><h2>{needsBooking.length} rencana siap dipesan</h2></div></div>{needsBooking.map((trip) => <article className="approval-row" key={trip.id} data-testid={`booking-trip-${trip.id}`}><div><strong>{trip.title}</strong><span>{trip.branch} · Anggaran Rp{trip.total_budget.toLocaleString("id-ID")}</span></div><button type="button" className="primary-button" onClick={() => book(trip.id)} data-testid={`confirm-booking-${trip.id}`}><Ticket size={18} weight="bold" /> Checklist pemesanan</button></article>)}{!needsBooking.length && <p className="empty-state" data-testid="booking-empty-state">Belum ada RAB yang siap dipesankan.</p>}</section>}{role === "PIC Accounting" && <section className="data-panel" data-testid="revision-inbox-panel"><div className="panel-heading"><div><p className="eyebrow">NOTIFIKASI REVISI</p><h2>{notifications.length} tindak lanjut RAB</h2></div></div>{notifications.map((notification) => <article className="inbox-item" key={notification.id} data-testid={`revision-notification-${notification.id}`}><Ticket size={24} weight="fill" /><div><strong>{notification.message}</strong><span>{notification.comment || "Buka Rencana STO untuk memperbarui alokasi."}</span></div></article>)}{!notifications.length && <p className="empty-state" data-testid="revision-notification-empty-state">Tidak ada revisi RAB baru.</p>}</section>}<section className="data-panel" data-testid="confirmed-booking-panel"><div className="panel-heading"><div><p className="eyebrow">{role === "PIC Accounting" ? "PESANAN SAYA" : "TERKONFIRMASI"}</p><h2>Tiket & hotel terkonfirmasi</h2></div></div>{booked.map((trip) => <article className="inbox-item" key={trip.id} data-testid={`confirmed-booking-${trip.id}`}><CheckCircle size={24} weight="fill" /><div><strong>{trip.title}</strong><span>{trip.booking.flight_reference}</span><span>{trip.booking.hotel_reference}</span></div></article>)}{!booked.length && <p className="empty-state" data-testid="confirmed-booking-empty-state">Konfirmasi pemesanan akan tampil di sini.</p>}</section></div></section>;
}