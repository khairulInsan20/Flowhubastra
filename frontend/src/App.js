import "@/App.css";
import "@/TravelWizard.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Shell from "@/components/Shell";
import DashboardPage from "@/pages/DashboardPage";
import PlanPage from "@/pages/PlanPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import RealizationPage from "@/pages/RealizationPage";
import CentralInboxPage from "@/pages/CentralInboxPage";
import MonitoringPage from "@/pages/MonitoringPage";
import TravelReviewPage from "@/pages/TravelReviewPage";
import TravelWizardPage from "@/pages/TravelWizardPage";
import RabSubmissionDetailPage from "@/pages/RabSubmissionDetailPage";
import HistoryPage from "@/pages/HistoryPage";
import CentralRealizationPage from "@/pages/CentralRealizationPage";
import SpdMonitoringPage from "@/pages/SpdMonitoringPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="rencana" element={<PlanPage />} />
            <Route path="persetujuan" element={<ApprovalsPage />} />
            <Route path="realisasi" element={<CentralRealizationPage />} />
            <Route path="inbox" element={<CentralInboxPage />} />
            <Route path="monitoring" element={<SpdMonitoringPage />} />
            <Route path="ai-travel" element={<TravelWizardPage />} />
            <Route path="ai-travel/review" element={<TravelReviewPage />} />
            <Route path="rab-submissions/:submissionId" element={<RabSubmissionDetailPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
