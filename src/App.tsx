
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { AuthProvider } from "./context/AuthContext"
import Index from "./pages/Index"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import Campaigns from "./pages/Campaigns"
import CallHistory from "./pages/CallHistory"
import CallCenter from "./pages/CallCenter"
import Assistants from "./pages/Assistants"
import About from "./pages/About"
import Faq from "./pages/Faq"
import Pricing from "./pages/Pricing"
import Blog from "./pages/Blog"
import BlogPost from "./pages/BlogPost"
import ContactSales from "./pages/ContactSales"
import Documentation from "./pages/Documentation"
import ApiDocumentation from "./pages/ApiDocumentation"
import Tutorials from "./pages/Tutorials"
import CaseStudies from "./pages/CaseStudies"
import PrivacyPolicy from "./pages/PrivacyPolicy"
import TermsOfService from "./pages/TermsOfService"
import CookiePolicy from "./pages/CookiePolicy"
import NotFound from "./pages/NotFound"
import CampaignDetail from "./pages/CampaignDetail"
import Settings from "./pages/Settings"
import Calls from "./pages/Calls"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword from "./pages/ResetPassword"
import { VoiceAgentApp } from "./components/VoiceAgentApp"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/campaigns/:id" element={<CampaignDetail />} />
              <Route path="/call-history" element={<CallHistory />} />
              <Route path="/call-center" element={<CallCenter />} />
              <Route path="/calls" element={<Calls />} />
              <Route path="/assistants" element={<Assistants />} />
              <Route path="/voice-agents" element={<VoiceAgentApp />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/blog/:id" element={<BlogPost />} />
              <Route path="/contact-sales" element={<ContactSales />} />
              <Route path="/documentation" element={<Documentation />} />
              <Route path="/api-documentation" element={<ApiDocumentation />} />
              <Route path="/tutorials" element={<Tutorials />} />
              <Route path="/case-studies" element={<CaseStudies />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
              <Route path="/cookie-policy" element={<CookiePolicy />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
