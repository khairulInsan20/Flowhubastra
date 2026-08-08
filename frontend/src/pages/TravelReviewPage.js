import { useState } from "react";
import { ArrowLeft, CheckCircle, PaperPlaneTilt } from "@phosphor-icons/react";
import { useNavigate, useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function TravelReviewPage() {
  const { role } = useOutletContext();
  const navigate = useNavigate();
  const [plan] = useState(() => JSON.parse(sessionStorage.getItem("flowhub-review") || "{}"));
  const [proofs, setProofs] = useState({});
  const [notes, setNotes] = useState({});
  if (role !== "PIC Accounting") return <AccessDenied feature="Review perjalanan" roles="PIC Accounting" />;
  const items = [["Berangkat", plan.outbound], ["Pulang", plan.inbound], ["Hotel", plan.hotel], ...(plan.routes || []).map((route, index) => [`Transport ${index + 1}: ${route.origin} → ${route.destination}`, route])];
  return <section className="page-content review-page" data-testid="travel-review-page"><button className="text-button" type="button" onClick={() => navigate("/ai-travel")} data-testid="back-to-travel-wizard-button"><ArrowLeft size={17} /> Ubah pilihan perjalanan</button><div className="page-heading"><div><p className="eyebrow">FLOWHUB / REVIEW TERAKHIR</p><h1>Periksa pilihan dan unggah bukti</h1><p>Anda dapat kembali untuk mengganti pilihan. Lampirkan bukti untuk setiap item sebelum mengirim RAB.</p></div></div><div className="review-bento">{items.filter(([, item]) => item).map(([label, item], index) => <article key={label} className="proof-card" data-testid={`review-item-${index}`}><p className="eyebrow">{label}</p><strong>{item.title || item.mode}</strong><span>{item.time || item.date || item.distance}</span><label>Harga aktual<input type="number" defaultValue={item.price} data-testid={`review-price-${index}-input`} /></label><label>Notes (jika ada)<textarea value={notes[index] || ""} onChange={(event) => setNotes({ ...notes, [index]: event.target.value })} data-testid={`review-note-${index}-input`} /></label><img className="dummy-proof" src="https://static.prod-images.emergentagent.com/jobs/c2d847af-4193-46fc-8fa2-4c8aa430117f/images/67f094a33a4f68b0e8b64ba8c99221ed9c528ac00e380ce6b825d8a57bcc8823.jpeg" alt="Contoh bukti perjalanan" data-testid={`dummy-proof-${index}`} /><label className="proof-dropzone">Upload bukti<input type="file" onChange={(event) => setProofs({ ...proofs, [index]: event.target.files?.[0]?.name || "" })} data-testid={`review-proof-${index}-input`} /><span>{proofs[index] || "Pilih foto atau PDF"}</span></label></article>)}</div><button className="primary-button" type="button" data-testid="submit-final-rab-button"><PaperPlaneTilt size={18} /> Kirim RAB</button></section>;
}