import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle } from "@phosphor-icons/react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { getRabSubmissions } from "@/api";
import AccessDenied from "@/components/AccessDenied";

export default function RabSubmissionDetailPage() {
  const { role } = useOutletContext();
  const { submissionId } = useParams();
  const [submission, setSubmission] = useState(null);
  useEffect(() => { getRabSubmissions().then((items) => setSubmission(items.find((item) => item.id === submissionId))); }, [submissionId]);
  if (!["Koordinator", "SPV", "Manager", "Sekretaris Divisi", "PIC Accounting"].includes(role)) return <AccessDenied feature="Rincian RAB" roles="pengaju dan reviewer RAB" />;
  if (!submission) return <div className="page-message" data-testid="rab-detail-loading">Memuat rincian RAB...</div>;
  return <section className="page-content review-page" data-testid="rab-submission-detail-page"><Link className="text-button" to={role === "Sekretaris Divisi" ? "/inbox" : "/persetujuan"} data-testid="back-to-rab-list-link"><ArrowLeft size={17} /> Kembali ke antrean</Link><div className="page-heading"><div><p className="eyebrow">RINCIAN RAB / {submission.status}</p><h1>{submission.title}</h1><p>Rincian yang sama dengan review PIC, termasuk notes dan bukti yang diajukan.</p></div></div><div className="review-bento">{submission.items.map((item, index) => <article key={`${item.label}-${index}`} className="proof-card" data-testid={`rab-detail-item-${index}`}><p className="eyebrow">{item.label}</p><strong>{item.title || item.mode}</strong><span>{item.time || item.date || item.distance}</span><p data-testid={`rab-detail-note-${index}`}>Notes: {item.note || "—"}</p><img className="dummy-proof" src={item.proof_url} alt={`Bukti ${item.label}`} data-testid={`rab-detail-proof-${index}`} /><span><CheckCircle size={16} weight="fill" /> Bukti terlampir</span></article>)}</div></section>;
}