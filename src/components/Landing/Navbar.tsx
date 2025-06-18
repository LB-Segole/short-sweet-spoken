
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-gray-900 text-white sticky top-0 z-50 shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          AIVoiceCaller
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="flex space-x-6">
            <Link to="/about" className="text-gray-300 hover:text-white transition-colors">About</Link>
            <Link to="/pricing" className="text-gray-300 hover:text-white transition-colors">Pricing</Link>
            <Link to="/faq" className="text-gray-300 hover:text-white transition-colors">FAQ</Link>
            <Link to="/blog" className="text-gray-300 hover:text-white transition-colors">Blog</Link>
          </div>
          
          <div className="flex space-x-4">
            <Button 
              variant="outline" 
              className="text-white border-white hover:bg-white/10"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
          </div>
        </div>
        
        {/* Mobile menu button */}
        <button 
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu size={24} />
        </button>
      </div>
      
      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div 
            className="bg-black bg-opacity-50 absolute inset-0"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          
          {/* Menu panel */}
          <div className="bg-gray-900 absolute right-0 top-0 h-full w-64 p-6">
            <div className="flex justify-end">
              <button 
                className="text-gray-300 hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="flex flex-col space-y-4 mt-8">
              <Link 
                to="/about" 
                className="text-gray-300 hover:text-white py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <Link 
                to="/pricing" 
                className="text-gray-300 hover:text-white py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/faq" 
                className="text-gray-300 hover:text-white py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQ
              </Link>
              <Link 
                to="/blog" 
                className="text-gray-300 hover:text-white py-2 transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Blog
              </Link>
              
              <div className="pt-4 border-t border-gray-700 mt-4">
                <Button 
                  variant="outline" 
                  className="w-full mb-3 text-white border-white hover:bg-white/10"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button 
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => {
                    navigate('/register');
                    setMobileMenuOpen(false);
                  }}
                >
                  Register
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
