import "@/App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import Shell from "@/components/Shell";
import DashboardPage from "@/pages/DashboardPage";
import PlanPage from "@/pages/PlanPage";
import ApprovalsPage from "@/pages/ApprovalsPage";
import RealizationPage from "@/pages/RealizationPage";
import InboxPage from "@/pages/InboxPage";
import MonitoringPage from "@/pages/MonitoringPage";
import StagedTravelAssistantPage from "@/pages/StagedTravelAssistantPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Shell />}>
            <Route index element={<DashboardPage />} />
            <Route path="rencana" element={<PlanPage />} />
            <Route path="persetujuan" element={<ApprovalsPage />} />
            <Route path="realisasi" element={<RealizationPage />} />
            <Route path="inbox" element={<InboxPage />} />
            <Route path="monitoring" element={<MonitoringPage />} />
            <Route path="ai-travel" element={<StagedTravelAssistantPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;
