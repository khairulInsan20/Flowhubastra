import { useEffect, useState } from "react";
import { getRabSubmissions } from "@/api";
import { Link } from "react-router-dom";

export default function HistoryPage() {
  const [items, setItems] = useState([]);
  useEffect(() => { getRabSubmissions().then((data) => setItems(data.filter((item) => ["SELESAI REALISASI", "HISTORY"].includes(item.status)))); }, []);
  return <section className="page-content" data-testid="history-page"><div className="page-heading"><div><p className="eyebrow">FLOWHUB / HISTORY</p><h1>Riwayat RAB terealisasi</h1><p>Pengajuan yang telah menyelesaikan realisasi akan muncul di sini.</p></div></div><section className="data-panel">{items.map((item) => <article className="approval-row" key={item.id}><div><strong>{item.title}</strong><span>{item.status}</span></div><Link className="primary-button" to={`/rab-submissions/${item.id}`} data-testid={`view-history-${item.id}`}>Lihat rincian</Link></article>)}{!items.length && <p className="empty-state">Belum ada RAB yang selesai direalisasi.</p>}</section></section>;
}