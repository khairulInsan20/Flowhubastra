import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, Clock, WarningCircle } from "@phosphor-icons/react";
import { getDashboard } from "@/api";
import BudgetBar from "@/components/BudgetBar";

const numberFormatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError("Data dashboard belum dapat dimuat."));
  }, []);

  if (error) return <div className="page-message" data-testid="dashboard-error-message">{error}</div>;
  if (!data) return <div className="page-message" data-testid="dashboard-loading-state">Memuat kendali STO...</div>;

  const cards = [
    { label: "Rencana aktif", value: data.summary.total_trips, icon: Clock, color: "neutral" },
    { label: "Menunggu tindakan", value: data.summary.pending, icon: WarningCircle, color: "warning" },
    { label: "Siap reimbursement", value: data.summary.reimbursement_ready, icon: CheckCircle, color: "success" },
    { label: "Indikasi overbudget", value: data.summary.over_budget, icon: WarningCircle, color: "danger" },
  ];

  return (
    <section className="page-content" data-testid="dashboard-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow" data-testid="dashboard-eyebrow">PUSAT KENDALI</p>
          <h1 data-testid="dashboard-title">Ringkasan siklus STO</h1>
          <p data-testid="dashboard-description">Pantau pengajuan RAB, keputusan berjenjang, dan kesiapan reimbursement.</p>
        </div>
        <Link className="primary-button" to="/rencana" data-testid="new-trip-plan-link">Buat rencana STO <ArrowRight size={18} weight="bold" /></Link>
      </div>

      <div className="metric-grid" data-testid="dashboard-summary-metrics">
        {cards.map((card) => {
          const Icon = card.icon;
          return <article className="metric-card" key={card.label} data-testid={`summary-${card.label.toLowerCase().replaceAll(" ", "-")}`}>
            <div className={`metric-icon ${card.color}`}><Icon size={22} weight="bold" /></div>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>;
        })}
      </div>

      <div className="section-grid">
        <section className="data-panel" data-testid="active-trip-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">ANTRIAN TERBARU</p><h2>Rencana perjalanan</h2></div>
            <Link to="/monitoring" data-testid="view-all-monitoring-link">Lihat monitoring <ArrowRight size={16} /></Link>
          </div>
          <div className="trip-list">
            {data.trips.map((trip) => <article className="trip-row" key={trip.id} data-testid={`dashboard-trip-${trip.id}`}>
              <div className="trip-date"><strong>{new Date(`${trip.start_date}T00:00:00`).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</strong><span>{trip.region}</span></div>
              <div className="trip-info"><strong>{trip.title}</strong><span>{trip.branch} · {trip.departure_city}</span></div>
              <div className="trip-budget"><span>Anggaran fleksibel</span><strong>{numberFormatter.format(trip.total_budget)}</strong></div>
              <span className="status-chip" data-testid={`trip-status-${trip.id}`}>{trip.status}</span>
            </article>)}
          </div>
        </section>
        <section className="data-panel budget-panel" data-testid="budget-focus-panel">
          <p className="eyebrow">ALOKASI PIC</p>
          <h2>{data.trips[0]?.title || "Belum ada rencana"}</h2>
          <p className="muted" data-testid="budget-flexibility-note">PIC menentukan proporsi sesuai kebutuhan perjalanan, dalam total anggaran yang disetujui.</p>
          {data.trips[0] && <BudgetBar allocations={data.trips[0].allocations} />}
          <div className="budget-total" data-testid="budget-focus-total"><span>Total RAB</span><strong>{data.trips[0] ? numberFormatter.format(data.trips[0].total_budget) : "—"}</strong></div>
        </section>
      </div>
    </section>
  );
}