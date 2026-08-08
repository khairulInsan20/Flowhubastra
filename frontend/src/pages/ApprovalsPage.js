import { useEffect, useState } from "react";
import { Check, NotePencil } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getTrips, reviewTrip } from "@/api";
import { Link, useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";
import TripDetailPanel from "@/components/TripDetailPanel";
import { getRabSubmissions } from "@/api";

export default function ApprovalsPage() {
  const { role } = useOutletContext();
  const [trips, setTrips] = useState([]);
  const [comment, setComment] = useState("");
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const load = () => getTrips().then(setTrips).catch(() => toast.error("Daftar review belum dapat dimuat."));
  useEffect(() => { load(); }, []);
  useEffect(() => { getRabSubmissions().then((items) => setSubmissions(items.filter((submission) => (role === "Koordinator" && submission.status === "MENUNGGU KOORDINATOR") || (role === "SPV" && submission.status === "MENUNGGU SPV") || (role === "Manager" && submission.status === "MENUNGGU MANAGER")))); }, [role]);
  const centralQueue = submissions.filter((submission) => (role === "Koordinator" && submission.status === "MENUNGGU KOORDINATOR") || (role === "SPV" && submission.status === "MENUNGGU SPV") || (role === "Manager" && submission.status === "MENUNGGU MANAGER"));
  if (!["Koordinator", "SPV", "Manager"].includes(role)) {
    return <AccessDenied feature="Monitoring RAB" roles="Koordinator, SPV, dan Manager" />;
  }
  const reviewable = trips.filter((trip) => trip.status.includes("MENUNGGU"));
  async function act(tripId, action) {
    try {
      await reviewTrip(tripId, { actor_role: role, action, comment });
      toast.success(action === "approve" ? "RAB diteruskan ke tahap berikutnya." : "RAB dikembalikan untuk revisi.");
      setComment("");
      load();
    } catch (error) { toast.error(error.response?.data?.detail || "Aksi belum dapat diproses."); }
  }
  return <section className="page-content" data-testid="approvals-page"><div className="page-heading"><div><p className="eyebrow">MONITORING RAB</p><h1 data-testid="approvals-title">Monitoring & review RAB</h1><p data-testid="approvals-role-note">Anda sedang meninjau sebagai {role}.</p></div></div><section className="data-panel" data-testid="central-rab-queue"><div className="panel-heading"><div><p className="eyebrow">PENGAJUAN PIC</p><h2>{submissions.length} RAB siap ditinjau</h2></div></div>{submissions.map((submission) => <article className="approval-row" key={submission.id} data-testid={`central-rab-${submission.id}`}><div><strong>{submission.title}</strong><span>{submission.status} · {submission.items.length} komponen perjalanan</span></div><Link className="primary-button" to={`/rab-submissions/${submission.id}`} data-testid={`view-rab-review-${submission.id}`}>Lihat rincian & bukti</Link></article>)}{!submissions.length && <p className="empty-state" data-testid="central-rab-empty-state">Belum ada RAB dari PIC.</p>}</section><section className="data-panel" data-testid="approval-queue-panel"><div className="panel-heading"><div><p className="eyebrow">ANTRIAN RAB TERJADWAL</p><h2>{reviewable.length} rencana menunggu tindakan</h2></div></div><label className="review-comment-label">Catatan reviewer<textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Tambahkan catatan bila diperlukan" data-testid="approval-comment-input" /></label>{reviewable.map((trip) => <article className="approval-row" key={trip.id} data-testid={`approval-trip-${trip.id}`}><div><strong>{trip.title}</strong><span>{trip.branch} · {trip.status}</span></div><div className="approval-actions"><button type="button" className="secondary-button" onClick={() => setSelectedTrip(trip)} data-testid={`view-trip-detail-${trip.id}`}>Lihat rincian</button><button type="button" className="secondary-button" onClick={() => act(trip.id, "revisi")} data-testid={`request-revision-${trip.id}`}><NotePencil size={17} /> Revisi</button><button type="button" className="primary-button" onClick={() => act(trip.id, "approve")} data-testid={`approve-trip-${trip.id}`}><Check size={17} weight="bold" /> Setujui</button></div></article>)}</section><TripDetailPanel trip={selectedTrip} onClose={() => setSelectedTrip(null)} /></section>;
}