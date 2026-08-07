import { useOutletContext } from "react-router-dom";
import AccessDenied from "@/components/AccessDenied";
import CoordinatorSchedulePanel from "@/components/CoordinatorSchedulePanel";
import PicAllocationPanel from "@/components/PicAllocationPanel";

export default function PlanPage() {
  const { role, profileId } = useOutletContext();

  if (!["PIC Accounting", "Koordinator"].includes(role)) {
    return <AccessDenied feature="Rencana STO" roles="PIC Accounting dan Koordinator" />;
  }

  return <section className="page-content" data-testid="trip-plan-page">
    <div className="page-heading"><div><p className="eyebrow">PRA-STO / RENCANA STO</p><h1 data-testid="trip-plan-title">Rencana perjalanan & alokasi</h1><p data-testid="trip-plan-description">Koordinator menetapkan penugasan, lalu PIC menentukan proporsi biaya perjalanan.</p></div></div>
    <div className="plan-grid">{role === "Koordinator" ? <CoordinatorSchedulePanel /> : <PicAllocationPanel profileId={profileId} />}</div>
  </section>;
}