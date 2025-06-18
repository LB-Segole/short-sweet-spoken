import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Phone, 
  Users, 
  Settings, 
  LogOut, 
  Bot,
  History,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import FloatingAIChat from '@/components/Chatbot/FloatingAIChat';
import ContactSupportModal from '@/components/Support/ContactSupportModal';
import PaymentModal from '@/components/Payment/PaymentModal';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showContactSupport, setShowContactSupport] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Phone, label: 'Campaigns', path: '/campaigns' },
    { icon: History, label: 'Call History', path: '/call-history' },
    { icon: Phone, label: 'Call Center', path: '/call-center' },
    { icon: Bot, label: 'AI Agents', path: '/assistants' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold text-gray-900">First Choice LLC</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <Button
                key={item.path}
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate(item.path)}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </Button>
            ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => setShowContactSupport(true)}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              Contact Support
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64">
        <main className="p-8">
          <Outlet />
        </main>
      </div>

      {/* Floating AI Chat */}
      <FloatingAIChat />

      {/* Modals */}
      <ContactSupportModal 
        isOpen={showContactSupport} 
        onClose={() => setShowContactSupport(false)} 
      />
      
      <PaymentModal 
        isOpen={showPaymentModal} 
        onClose={() => setShowPaymentModal(false)} 
      />
    </div>
  );
};

export default MainLayout;
