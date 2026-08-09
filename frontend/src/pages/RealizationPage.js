import { useCallback, useEffect, useState } from "react";
import { PaperPlaneTilt, Receipt } from "@phosphor-icons/react";
import { toast } from "sonner";
import { getTrips, submitRealization } from "@/api";
import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";

export default function RealizationPage() {
  const { role } = useOutletContext();

  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");

  const [form, setForm] = useState({
    description: "Transportasi lokal cabang ke hotel",
    amount: "280000",
    account: "BCA 1234567890 a.n. Nadia Pratama",
    rating: "4",
    note: "Jadwal perjalanan dan hotel mendukung pelaksanaan STO dengan baik.",
  });

  const load = useCallback(() => {
    getTrips().then((items) => {
      setTrips(items);

      if (!tripId && items.length) {
        setTripId(items[0].id);
      }
    });
  }, [tripId]);

  useEffect(() => {
    load();
  }, [load]);

  if (role !== "PIC Accounting") {
    return <AccessDenied />;
  }

  const selected = trips.find((trip) => trip.id === tripId);

  async function send(event) {
    event.preventDefault();

    try {
      await submitRealization(tripId, {
        actor_role: role,
        expenses: [
          {
            category: "Transport lokal",
            description: form.description,
            amount: Number(form.amount),
            proof_name: "bukti_transport.pdf",
          },
        ],
        reimbursement_account: form.account,
        survey_rating: Number(form.rating),
        survey_note: form.note,
      });

      toast.success(
        "Realisasi dan survei dikirim untuk verifikasi."
      );

      load();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Realisasi belum dapat dikirim."
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          PASCA-STO / PIC ACCOUNTING
        </h1>

        <p className="text-sm text-muted-foreground">
          Realisasi & reimbursement
        </p>

        <p className="text-sm text-muted-foreground">
          Catat pengeluaran di luar tiket dan hotel,
          unggah bukti, lalu lengkapi rekening dan survei.
        </p>
      </div>

      <form onSubmit={send} className="space-y-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Pengeluaran aktual
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rencana STO
            </label>

            <select
              value={tripId}
              onChange={(event) =>
                setTripId(event.target.value)
              }
              data-testid="realization-trip-select"
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="">
                Pilih rencana STO
              </option>

              {trips.map((trip) => (
                <option
                  key={trip.id}
                  value={trip.id}
                >
                  {trip.title} — {trip.status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rincian pengeluaran
            </label>

            <input
              value={form.description}
              onChange={(event) =>
                setForm({
                  ...form,
                  description: event.target.value,
                })
              }
              data-testid="actual-expense-description-input"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nilai aktual (IDR)
            </label>

            <input
              type="number"
              value={form.amount}
              onChange={(event) =>
                setForm({
                  ...form,
                  amount: event.target.value,
                })
              }
              data-testid="actual-expense-amount-input"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="rounded-md border p-4">
            <div className="flex items-center gap-2">
              <Receipt size={20} />
              <span className="font-medium">
                Bukti pengeluaran
              </span>
            </div>

            <p className="mt-2 text-sm text-muted-foreground">
              Bukti akan menggunakan nama file
              <strong> bukti_transport.pdf</strong>.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Reimbursement & survei
          </h2>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Rekening pengembalian
            </label>

            <input
              value={form.account}
              onChange={(event) =>
                setForm({
                  ...form,
                  account: event.target.value,
                })
              }
              data-testid="reimbursement-account-input"
              className="w-full rounded-md border px-3 py-2"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Penilaian perjalanan
            </label>

            <select
              value={form.rating}
              onChange={(event) =>
                setForm({
                  ...form,
                  rating: event.target.value,
                })
              }
              data-testid="travel-survey-rating-select"
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="1">1 dari 5</option>
              <option value="2">2 dari 5</option>
              <option value="3">3 dari 5</option>
              <option value="4">4 dari 5</option>
              <option value="5">5 dari 5</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Catatan survei
            </label>

            <textarea
              value={form.note}
              onChange={(event) =>
                setForm({
                  ...form,
                  note: event.target.value,
                })
              }
              data-testid="travel-survey-note-input"
              className="w-full rounded-md border px-3 py-2"
              rows={4}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={!tripId}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 disabled:opacity-50"
        >
          <PaperPlaneTilt size={18} />
          Kirim realisasi
        </button>
      </form>

      <div className="space-y-4 rounded-md border p-4">
        <div>
          <h2 className="font-semibold">
            STATUS PELAPORAN
          </h2>

          <p className="text-sm">
            {selected?.status || "Pilih rencana"}
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          Realisasi dapat dikirim setelah tiket dan hotel
          dikonfirmasi oleh Sekretaris Divisi.
        </p>

        <div>
          <div className="mb-2 flex justify-between text-sm">
            <span>Checklist kelengkapan</span>

            <span>
              {selected?.realization ? "100%" : "40%"}
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: selected?.realization
                  ? "100%"
                  : "40%",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
