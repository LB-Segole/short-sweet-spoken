
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { MainLayout } from "@/components/Layout/MainLayout";

// Page imports
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import VoiceAgents from "./pages/VoiceAgents";
import Assistants from "./pages/Assistants";
import CallHistory from "./pages/CallHistory";
import Settings from "./pages/Settings";
import { Auth } from "./pages/Auth";
import AgentFlowEditor from "./pages/AgentFlowEditor";
import IntegrationsPage from "./pages/IntegrationsPage";
import { AgentOrchestration } from "./pages/AgentOrchestration";
import { TeamManagement } from "./pages/TeamManagement";
import AgentMarketplace from "./pages/AgentMarketplace";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Index />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="voice-agents" element={<VoiceAgents />} />
                <Route path="assistants" element={<Assistants />} />
                <Route path="call-history" element={<CallHistory />} />
                <Route path="settings" element={<Settings />} />
                <Route path="agent-flow-editor" element={<AgentFlowEditor />} />
                <Route path="integrations" element={<IntegrationsPage />} />
                <Route path="orchestration" element={<AgentOrchestration />} />
                <Route path="teams" element={<TeamManagement />} />
                <Route path="marketplace" element={<AgentMarketplace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
