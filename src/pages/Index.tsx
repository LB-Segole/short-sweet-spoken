
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Phone, ListChecks, LayoutDashboard } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 flex flex-col items-center">
        <h1 className="text-5xl font-bold mb-6 text-center">AI Voice Caller</h1>
        <p className="text-xl text-gray-300 mb-8 text-center max-w-2xl">
          Automate your outbound calls with AI-powered voice technology. Reach more customers with natural conversations.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90"
            onClick={() => navigate('/campaigns')}
          >
            Get Started
          </Button>
          <Button 
            size="lg"
            variant="outline" 
            className="text-white border-white hover:bg-white/10"
            onClick={() => navigate('/login')}
          >
            Log In
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold mb-12 text-center">Key Features</h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800/50 p-6 rounded-lg flex flex-col items-center text-center">
            <div className="p-4 bg-primary/20 rounded-full mb-4">
              <LayoutDashboard size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Intuitive Dashboard</h3>
            <p className="text-gray-300">Monitor all your campaigns and call metrics from a single dashboard.</p>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-lg flex flex-col items-center text-center">
            <div className="p-4 bg-primary/20 rounded-full mb-4">
              <ListChecks size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Campaign Management</h3>
            <p className="text-gray-300">Create, schedule, and optimize your calling campaigns with ease.</p>
          </div>
          
          <div className="bg-gray-800/50 p-6 rounded-lg flex flex-col items-center text-center">
            <div className="p-4 bg-primary/20 rounded-full mb-4">
              <Phone size={32} className="text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">AI Voice Technology</h3>
            <p className="text-gray-300">Natural-sounding AI voices with intelligent conversation capabilities.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to automate your calling?</h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Start connecting with more customers today using our AI voice technology.
        </p>
        <Button 
          size="lg" 
          className="bg-primary hover:bg-primary/90"
          onClick={() => navigate('/register')}
        >
          Create Your Account
        </Button>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-700 mt-12">
        <p className="text-center text-gray-400">
          © {new Date().getFullYear()} AI Voice Caller. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
