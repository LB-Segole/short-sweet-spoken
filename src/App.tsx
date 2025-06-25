import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Account from './pages/Account';
import VoiceAgents from './pages/VoiceAgents';

import AgentEditor from './pages/AgentEditor';
import Pricing from './pages/Pricing';
import CallLogs from './pages/CallLogs';
import { Toaster } from '@/components/ui/toaster';
import { LandingPage } from './pages/LandingPage';
import AgentFlowEditor from '@/pages/AgentFlowEditor';

function App() {
  const { currentUser } = useAuth();

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return currentUser ? <>{children}</> : <Navigate to="/login" />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Pricing />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/voice-agents" 
          element={
            <ProtectedRoute>
              <VoiceAgents />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agent-editor/:agentId" 
          element={
            <ProtectedRoute>
              <AgentEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/call-logs" 
          element={
            <ProtectedRoute>
              <CallLogs />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/agent-flow-editor/:flowId" 
          element={
            <ProtectedRoute>
              <AgentFlowEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/agent-flow-editor" 
          element={
            <ProtectedRoute>
              <AgentFlowEditor />
            </ProtectedRoute>
          } 
        />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
