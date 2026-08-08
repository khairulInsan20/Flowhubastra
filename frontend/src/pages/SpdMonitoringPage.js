import { useEffect, useState } from "react";
import { actionRabSubmission, getRabSubmissions } from "@/api";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function SpdMonitoringPage() {
  const { role } = useOutletContext();
  const [items, setItems] = useState([]);
  const load = () => getRabSubmissions().then((data) => setItems(data.filter((item) => item.status === "MENUNGGU SPD KOORDINATOR")));
  useEffect(() => { load(); }, []);
  if (role !== "Koordinator") return <AccessDenied feature="Monitoring SPD" roles="Koordinator" />;
  return <section className="page-content" data-testid="spd-monitoring-page"><div className="page-heading"><div><p className="eyebrow">FLOWHUB / MONITORING</p><h1>Checklist SPD PIC</h1><p>Selesaikan SPD setelah Sekretaris mengonfirmasi tiket dan hotel.</p></div></div><section className="data-panel">{items.map((item) => <article className="approval-row" key={item.id}><div><strong>{item.title}</strong><span>Siap diteruskan ke Realisasi PIC</span></div><button className="primary-button" type="button" onClick={() => actionRabSubmission(item.id, { actor_role: "Koordinator", action: "spd_done", component_notes: {} }).then(load)} data-testid={`complete-spd-${item.id}`}>Checklist SPD selesai</button></article>)}{!items.length && <p className="empty-state">Tidak ada SPD yang menunggu tindakan.</p>}</section></section>;
}