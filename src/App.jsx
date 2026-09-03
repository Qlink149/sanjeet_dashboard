import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import MainLayout from "./layout/MainLayout";
import { ThemeProvider } from "./providers/theme-provider";
import ComingSoon from "./pages/ComingSoon";
import LoginPage from "./pages/LoginPage";
import { AuthProvider } from "./context/auth-context";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

const ChatHistory = lazy(() => import("./pages/whatsapp/ChatHistory"));
const TriggerCampaign = lazy(() => import("./pages/whatsapp/TriggerCampaign"));
const Leads = lazy(() => import("./pages/whatsapp/Leads"));
const AllTemplates = lazy(() => import("./pages/whatsapp/AllTemplates"));
const CampaignAnalytics = lazy(() => import("./pages/whatsapp/CampaignAnalytics"));
const CampaignAnalyticsDetail = lazy(
  () => import("./pages/whatsapp/CampaignAnalyticsDetail")
);
const Masterclasses = lazy(() => import("./pages/whatsapp/Masterclasses"));

const PageFallback = () => (
  <div className="flex items-center justify-center h-[70vh]">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route element={<MainLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/chat-history" element={<ChatHistory />} />
                <Route path="/chat-history/:id" element={<ChatHistory />} />
                <Route path="templates" element={<AllTemplates />} />
                <Route path="/trigger-campaign" element={<TriggerCampaign />} />
                <Route path="/leads" element={<Leads />} />
                <Route path="/masterclasses" element={<Masterclasses />} />
                <Route path="/campaign-analytics" element={<CampaignAnalytics />} />
                <Route
                  path="/campaign-analytics/:id"
                  element={<CampaignAnalyticsDetail />}
                />
                <Route path="*" element={<ComingSoon />} />
              </Route>
              <Route path="/login" element={<LoginPage />} />
            </Routes>
          </Suspense>
          <Toaster />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
