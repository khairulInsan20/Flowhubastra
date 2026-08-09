import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  WarningCircle,
} from "@phosphor-icons/react";
import { getDashboard } from "@/api";
import BudgetBar from "@/components/BudgetBar";

const numberFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getDashboard()
      .then((result) => {
        setData(result);
      })
      .catch(() => {
        setError("Data dashboard belum dapat dimuat.");
      });
  }, []);

  if (error) {
    return (
      <div className="data-panel">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="data-panel">
        <p>Memuat kendali STO...</p>
      </div>
    );
  }

  const summary = data.summary || {};
  const trips = Array.isArray(data.trips) ? data.trips : [];

  const cards = [
    {
      label: "Rencana aktif",
      value: summary.total_trips ?? 0,
      icon: Clock,
      color: "neutral",
    },
    {
      label: "Menunggu tindakan",
      value: summary.pending ?? 0,
      icon: WarningCircle,
      color: "warning",
    },
    {
      label: "Siap reimbursement",
      value: summary.reimbursement_ready ?? 0,
      icon: CheckCircle,
      color: "success",
    },
    {
      label: "Indikasi overbudget",
      value: summary.over_budget ?? 0,
      icon: WarningCircle,
      color: "danger",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">PUSAT KENDALI</p>

          <h1 className="text-2xl font-semibold">
            Ringkasan siklus STO
          </h1>

          <p className="muted">
            Pantau pengajuan RAB, keputusan berjenjang,
            dan kesiapan reimbursement.
          </p>
        </div>

        <Link
          to="/rencana"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2"
        >
          Buat rencana STO
          <ArrowRight size={16} />
        </Link>
      </div>

      <div
        className="metric-grid"
        data-testid="dashboard-summary-metrics"
      >
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              className="metric-card"
              key={card.label}
              data-testid={`summary-${card.label
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              <div
                className={`metric-icon ${card.color}`}
              >
                <Icon size={22} weight="bold" />
              </div>

              <p>{card.label}</p>

              <strong>{card.value}</strong>
            </article>
          );
        })}
      </div>

      <div className="section-grid">
        <section
          className="data-panel"
          data-testid="active-trip-panel"
        >
          <div className="panel-heading">
            <div>
              <p className="eyebrow">
                ANTRIAN TERBARU
              </p>

              <h2>Rencana perjalanan</h2>
            </div>

            <Link
              to="/monitoring"
              data-testid="view-all-monitoring-link"
            >
              Lihat monitoring
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="trip-list">
            {trips.length === 0 ? (
              <p className="muted">
                Belum ada rencana perjalanan.
              </p>
            ) : (
              trips.map((trip) => (
                <article
                  className="trip-row"
                  key={trip.id}
                  data-testid={`dashboard-trip-${trip.id}`}
                >
                  <div className="trip-date">
                    <strong>
                      {trip.start_date
                        ? new Date(
                            `${trip.start_date}T00:00:00`
                          ).toLocaleDateString(
                            "id-ID",
                            {
                              day: "2-digit",
                              month: "short",
                            }
                          )
                        : "—"}
                    </strong>

                    <span>
                      {trip.region || "—"}
                    </span>
                  </div>

                  <div className="trip-info">
                    <strong>
                      {trip.title || "Tanpa judul"}
                    </strong>

                    <span>
                      {trip.branch || "—"} ·{" "}
                      {trip.departure_city || "—"}
                    </span>
                  </div>

                  <div className="trip-budget">
                    <span>
                      Anggaran fleksibel
                    </span>

                    <strong>
                      {numberFormatter.format(
                        Number(trip.total_budget || 0)
                      )}
                    </strong>
                  </div>

                  <span
                    className="status-chip"
                    data-testid={`trip-status-${trip.id}`}
                  >
                    {trip.status || "—"}
                  </span>
                </article>
              ))
            )}
          </div>
        </section>

        <section
          className="data-panel budget-panel"
          data-testid="budget-focus-panel"
        >
          <p className="eyebrow">
            ALOKASI PIC
          </p>

          <h2>
            {trips[0]?.title ||
              "Belum ada rencana"}
          </h2>

          <p
            className="muted"
            data-testid="budget-flexibility-note"
          >
            PIC menentukan proporsi sesuai kebutuhan
            perjalanan, dalam total anggaran yang
            disetujui.
          </p>

          {trips[0] && (
            <BudgetBar
              allocations={
                trips[0].allocations || []
              }
            />
          )}

          <div
            className="budget-total"
            data-testid="budget-focus-total"
          >
            <span>Total RAB</span>

            <strong>
              {trips[0]
                ? numberFormatter.format(
                    Number(
                      trips[0].total_budget || 0
                    )
                  )
                : "—"}
            </strong>
          </div>
        </section>
      </div>
    </section>
  );
}
