import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";

// Pages
import LandingPage from "@/pages/LandingPage";
import Dashboard from "@/pages/Dashboard";
import Campaigns from "@/pages/Campaigns";
import CallHistory from "@/pages/CallHistory";
import CallCenter from "@/pages/CallCenter";
import Assistants from "@/pages/Assistants";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Settings from "@/pages/Settings";
import Pricing from "@/pages/Pricing";
import About from "@/pages/About";
import Faq from "@/pages/Faq";
import Blog from "@/pages/Blog";
import Documentation from "@/pages/Documentation";
import ApiDocumentation from "@/pages/ApiDocumentation";
import Tutorials from "@/pages/Tutorials";
import CaseStudies from "@/pages/CaseStudies";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import CookiePolicy from "@/pages/CookiePolicy";
import NotFound from "@/pages/NotFound";

// Components
import ProtectedRoute from "@/components/ProtectedRoute";
import MainLayout from "@/components/Layout/MainLayout";

// Create QueryClient with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/about" element={<About />} />
            <Route path="/faq" element={<Faq />} />
            
            {/* Resource pages */}
            <Route path="/blog" element={<Blog />} />
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/api-documentation" element={<ApiDocumentation />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/case-studies" element={<CaseStudies />} />
            
            {/* Policy pages */}
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/cookie-policy" element={<CookiePolicy />} />
            
            {/* Protected routes */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/campaigns" element={<Campaigns />} />
              <Route path="/call-history" element={<CallHistory />} />
              <Route path="/call-center" element={<CallCenter />} />
              <Route path="/assistants" element={<Assistants />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            
            {/* 404 route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
