import { useCallback, useEffect, useMemo, useState } from "react";
import { PaperPlaneTilt } from "@phosphor-icons/react";
import { toast } from "sonner";
import {
  getTrips,
  setAllocation,
  submitTrip,
} from "@/api";
import BudgetBar from "@/components/BudgetBar";

export default function PicAllocationPanel({
  profileId,
}) {
  const [trips, setTrips] = useState([]);
  const [tripId, setTripId] = useState("");

  const [allocations, setAllocations] = useState([
    {
      category: "Tiket",
      percentage: 30,
    },
    {
      category: "Hotel",
      percentage: 45,
    },
    {
      category: "Transport lokal",
      percentage: 25,
    },
  ]);

  const total = useMemo(() => {
    return allocations.reduce(
      (sum, item) =>
        sum + Number(item.percentage || 0),
      0
    );
  }, [allocations]);

  const assignedTrips = Array.isArray(trips)
    ? trips.filter(
        (trip) =>
          trip.assigned_pic_id === profileId &&
          [
            "DRAF ALOKASI PIC",
            "PERLU REVISI",
          ].includes(trip.status)
      )
    : [];

  const load = useCallback(() => {
    getTrips()
      .then((result) => {
        /*
         * Backend bisa mengembalikan:
         *
         * 1. Array langsung:
         *    [...]
         *
         * 2. Object:
         *    { trips: [...] }
         *
         * 3. Object:
         *    { data: [...] }
         */

        const items = Array.isArray(result)
          ? result
          : Array.isArray(result?.trips)
          ? result.trips
          : Array.isArray(result?.data)
          ? result.data
          : [];

        setTrips(items);

        const first = items.find(
          (trip) =>
            trip.assigned_pic_id === profileId &&
            [
              "DRAF ALOKASI PIC",
              "PERLU REVISI",
            ].includes(trip.status)
        );

        if (first) {
          setTripId(first.id);
        }
      })
      .catch(() => {
        setTrips([]);
        toast.error(
          "Data STO belum dapat dimuat."
        );
      });
  }, [profileId]);

  useEffect(() => {
    load();
  }, [load]);

  function updateAllocation(index, value) {
    setAllocations((current) =>
      current.map((item, currentIndex) =>
        currentIndex === index
          ? {
              ...item,
              percentage: Number(value),
            }
          : item
      )
    );
  }

  async function saveAndSubmit() {
    if (!tripId) {
      return toast.error(
        "Belum ada STO yang ditugaskan untuk alokasi."
      );
    }

    if (total !== 100) {
      return toast.error(
        "Total proporsi harus tepat 100%."
      );
    }

    try {
      await setAllocation(tripId, {
        actor_role: "PIC Accounting",
        pic_profile_id: profileId,
        allocations,
      });

      await submitTrip(tripId, profileId);

      toast.success(
        "Alokasi RAB dikirim ke Koordinator."
      );

      load();
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Alokasi belum dapat dikirim."
      );
    }
  }

  return (
    <section className="data-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            PIC ACCOUNTING / RENCANA ALOKASI
          </p>

          <h2>
            Tentukan proporsi anggaran
          </h2>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          STO yang ditugaskan
        </label>

        <select
          value={tripId}
          onChange={(event) =>
            setTripId(event.target.value)
          }
          data-testid="assigned-trip-select"
          className="w-full rounded-md border px-3 py-2"
        >
          <option value="">
            Pilih rencana STO
          </option>

          {assignedTrips.map((trip) => (
            <option
              key={trip.id}
              value={trip.id}
            >
              {trip.title} · {trip.branch}
            </option>
          ))}
        </select>

        {assignedTrips.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Belum ada STO yang ditugaskan.
          </p>
        )}
      </div>

      <div className="text-sm">
        <p>
          Profil PIC: Khairul Insan Al Amin
        </p>

        <p>
          Khairul.insan@ai.astra.co.id
        </p>

        <p>
          08882856395
        </p>
      </div>

      <div className="space-y-4">
        {allocations.map((item, index) => (
          <div
            key={item.category}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {item.category}
              </span>

              <output
                data-testid={`pic-allocation-${item.category
                  .toLowerCase()
                  .replaceAll(" ", "-")}-value`}
              >
                {item.percentage}%
              </output>
            </div>

            <input
              type="range"
              min="0"
              max="100"
              value={item.percentage}
              onChange={(event) =>
                updateAllocation(
                  index,
                  event.target.value
                )
              }
              data-testid={`pic-allocation-${item.category
                .toLowerCase()
                .replaceAll(" ", "-")}-range`}
              className="w-full"
            />
          </div>
        ))}
      </div>

      <div className="font-semibold">
        Total proporsi: {total}%
      </div>

      {total !== 100 && (
        <div className="text-sm text-red-500">
          Total proporsi harus tepat 100%.
        </div>
      )}

      <button
        type="button"
        onClick={saveAndSubmit}
        disabled={
          !tripId || total !== 100
        }
        className="inline-flex items-center gap-2 rounded-md px-4 py-2 disabled:opacity-50"
      >
        <PaperPlaneTilt size={18} />
        Kirim RAB
      </button>
    </section>
  );
}
