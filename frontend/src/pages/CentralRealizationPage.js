import { useEffect, useState } from "react";
import { getRabSubmissions } from "@/api";
import { Link, useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function CentralRealizationPage() {
  const { role } = useOutletContext();
  const [items, setItems] = useState([]);
  const load = () => getRabSubmissions().then((data) => setItems(data.filter((item) => item.status === "SIAP REALISASI PIC")));
  useEffect(() => { load(); }, []);
  if (role !== "PIC Accounting") return <AccessDenied feature="Realisasi" roles="PIC Accounting" />;
  return <section className="page-content" data-testid="central-realization-page"><div className="page-heading"><div><p className="eyebrow">FLOWHUB / REALISASI</p><h1>SPD siap direalisasi</h1><p>Pilih SPD untuk membuka semua komponen dan mengisi metadata nota per komponen.</p></div></div><section className="data-panel">{items.map((item) => <article className="approval-row" key={item.id}><div><strong>{item.title}</strong><span>{item.items.map((entry) => entry.label).join(" · ")}</span></div><Link className="primary-button" to={`/rab-submissions/${item.id}`} data-testid={`open-realization-${item.id}`}>Buka realisasi</Link></article>)}{!items.length && <p className="empty-state">Belum ada RAB yang siap direalisasi.</p>}</section></section>;
}