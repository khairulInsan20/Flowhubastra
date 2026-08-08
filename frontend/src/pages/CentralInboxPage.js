import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Bell, ClipboardText } from "@phosphor-icons/react";
import { getRabSubmissions } from "@/api";
import AccessDenied from "@/components/AccessDenied";

export default function CentralInboxPage() {
  const { role } = useOutletContext();
  const [submissions, setSubmissions] = useState([]);
  useEffect(() => { getRabSubmissions().then(setSubmissions); }, []);
  if (!["PIC Accounting", "Sekretaris Divisi"].includes(role)) return <AccessDenied feature="Inbox Pemesanan" roles="PIC Accounting dan Sekretaris Divisi" />;
  const isPic = role === "PIC Accounting";
  const relevant = submissions.filter((item) => isPic ? ["PERLU REVISI PIC", "MENUNGGU SPD KOORDINATOR", "SIAP REALISASI PIC"].includes(item.status) : ["MENUNGGU PEMESANAN", "MENUNGGU SPD KOORDINATOR", "TIKET DAN HOTEL DIKONFIRMASI"].includes(item.status));
  return <section className="page-content" data-testid="central-inbox-page"><div className="page-heading"><div><p className="eyebrow">FLOWHUB / INBOX</p><h1>{isPic ? "Revisi RAB saya" : "Tiket & hotel untuk dipesankan"}</h1><p>{isPic ? "Buka wizard pengajuan yang sama untuk memperbarui pilihan dan mengajukan ulang." : "Buka rincian RAB yang sudah disetujui lengkap sebelum memesan tiket dan hotel."}</p></div></div><section className="data-panel" data-testid="central-inbox-queue"><div className="panel-heading"><div><p className="eyebrow">{isPic ? "PERLU DIPERBAIKI" : "SIAP DIPESANKAN"}</p><h2>{relevant.length} pengajuan</h2></div></div>{relevant.map((item) => <article className="approval-row" key={item.id} data-testid={`inbox-rab-${item.id}`}><div><strong>{item.title}</strong><span>{item.status} · {item.items.length} komponen</span></div><Link className="primary-button" to={isPic ? "/ai-travel" : `/rab-submissions/${item.id}`} data-testid={`open-inbox-rab-${item.id}`}>{isPic ? <><Bell size={17} /> Revisi & ajukan ulang</> : <><ClipboardText size={17} /> Lihat rincian & pesan</>}</Link></article>)}{!relevant.length && <p className="empty-state" data-testid="central-inbox-empty-state">Tidak ada pengajuan yang memerlukan tindakan Anda.</p>}</section></section>;
}