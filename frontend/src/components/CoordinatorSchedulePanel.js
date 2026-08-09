import { useEffect, useState } from "react";
import { CalendarPlus } from "@phosphor-icons/react";
import { toast } from "sonner";
import { createSchedule, getPicProfiles } from "@/api";

export default function CoordinatorSchedulePanel() {
  const [profiles, setProfiles] = useState([]);

  const [form, setForm] = useState({
    title: "STO Part & Bahan Bandung",
    region: "Jawa Barat",
    branch: "Auto2000 Bandung Soekarno Hatta",
    departure_city: "Jakarta",
    start_date: "2026-04-14",
    end_date: "2026-04-16",
    total_budget: "4500000",
    pic_profile_id: "pic-nadia",
  });

  useEffect(() => {
    getPicProfiles()
      .then((result) => {
        const items = Array.isArray(result)
          ? result
          : Array.isArray(result?.profiles)
          ? result.profiles
          : Array.isArray(result?.data)
          ? result.data
          : [];

        setProfiles(items);
      })
      .catch(() => {
        setProfiles([]);
        toast.error(
          "Profil PIC belum dapat dimuat."
        );
      });
  }, []);

  function update(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function submit(event) {
    event.preventDefault();

    try {
      await createSchedule({
        data: {
          ...form,
          total_budget: Number(form.total_budget),
        },
        params: {
          actor_role: "Koordinator",
          coordinator_profile_id: "coord-jabar",
        },
      });

      toast.success(
        "Rencana perjalanan dibuat dan PIC telah ditugaskan."
      );
    } catch (error) {
      toast.error(
        error.response?.data?.detail ||
          "Rencana perjalanan belum dapat dibuat."
      );
    }
  }

  return (
    <section className="data-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            KOORDINATOR / RENCANA PERJALANAN
          </p>

          <h2>Tentukan jadwal, wilayah, dan PIC</h2>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="space-y-4"
      >
        {[
          ["title", "Nama STO"],
          ["region", "Wilayah"],
          ["branch", "Cabang tujuan"],
          [
            "departure_city",
            "Kota keberangkatan",
          ],
          [
            "start_date",
            "Tanggal mulai",
            "date",
          ],
          [
            "end_date",
            "Tanggal selesai",
            "date",
          ],
          [
            "total_budget",
            "Total anggaran (IDR)",
            "number",
          ],
        ].map(([name, label, type]) => (
          <div
            key={name}
            className="space-y-2"
          >
            <label
              htmlFor={name}
              className="text-sm font-medium"
            >
              {label}
            </label>

            <input
              id={name}
              name={name}
              type={type || "text"}
              value={form[name]}
              onChange={update}
              data-testid={`schedule-${name}-input`}
              className="w-full rounded-md border px-3 py-2"
            />
          </div>
        ))}

        <div className="space-y-2">
          <label
            htmlFor="pic_profile_id"
            className="text-sm font-medium"
          >
            PIC Accounting
          </label>

          <select
            id="pic_profile_id"
            name="pic_profile_id"
            value={form.pic_profile_id}
            onChange={update}
            data-testid="schedule-pic-input"
            className="w-full rounded-md border px-3 py-2"
          >
            <option value="">
              Pilih PIC Accounting
            </option>

            {profiles.map((profile) => (
              <option
                key={profile.profile_id}
                value={profile.profile_id}
              >
                {profile.name} · {profile.email}
              </option>
            ))}
          </select>

          {profiles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada profil PIC yang tersedia.
            </p>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-md px-4 py-2"
        >
          <CalendarPlus size={18} />
          Tugaskan PIC
        </button>
      </form>
    </section>
  );
}
