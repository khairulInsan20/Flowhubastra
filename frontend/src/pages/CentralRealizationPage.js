import { useEffect, useState } from "react";
import { completeRabRealization, getRabSubmissions } from "@/api";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function CentralRealizationPage() {
  const { role } = useOutletContext();
  const [items, setItems] = useState([]);
  const load = () => getRabSubmissions().then((data) => setItems(data.filter((item) => item.status === "SIAP REALISASI PIC")));
  useEffect(() => { load(); }, []);
  if (role !== "PIC Accounting") return <AccessDenied feature="Realisasi" roles="PIC Accounting" />;
  return <section className="page-content" data-testid="central-realization-page"><div className="page-heading"><div><p className="eyebrow">FLOWHUB / REALISASI</p><h1>Realisasi perjalanan</h1><p>Unggah metadata nota per komponen sebelum menyelesaikan realisasi.</p></div></div><section className="data-panel">{items.map((item) => <article className="approval-row" key={item.id}><div><strong>{item.title}</strong><span>{item.items.map((entry) => entry.label).join(" · ")}</span><input type="file" data-testid={`realization-proof-${item.id}`} /></div><button className="primary-button" type="button" onClick={() => completeRabRealization(item.id).then(load)} data-testid={`complete-realization-${item.id}`}>Selesaikan realisasi</button></article>)}{!items.length && <p className="empty-state">Belum ada RAB yang siap direalisasi.</p>}</section></section>;
}