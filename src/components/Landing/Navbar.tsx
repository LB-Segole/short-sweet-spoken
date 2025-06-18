
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

const Navbar = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        {/* Logo and Brand */}
        <Link to="/" className="text-2xl font-bold text-indigo-600">
          AIVoiceCaller
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link to="/" className="hover:text-gray-600">Home</Link>
          <Link to="/about" className="hover:text-gray-600">About</Link>
          <Link to="/case-studies" className="hover:text-gray-600">Case Studies</Link>
          <Link to="/blog" className="hover:text-gray-600">Blog</Link>
          <Link to="/api-documentation" className="hover:text-gray-600">API</Link>
          <Link to="/contact-sales" className="hover:text-gray-600">Contact Sales</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="hover:text-gray-600">Dashboard</Link>
              <Button onClick={handleLogout} variant="outline">Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link to="/register">
                <Button>Get Started</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation Button */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" className="hover:bg-gray-100">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="sm:w-2/3 md:w-1/2 lg:w-1/3">
            <SheetHeader>
              <SheetTitle>AIVoiceCaller</SheetTitle>
              <SheetDescription>
                Explore our platform and services.
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 py-4">
              <Link to="/" className="hover:text-gray-600 block py-2">Home</Link>
              <Link to="/about" className="hover:text-gray-600 block py-2">About</Link>
              <Link to="/case-studies" className="hover:text-gray-600 block py-2">Case Studies</Link>
              <Link to="/blog" className="hover:text-gray-600 block py-2">Blog</Link>
              <Link to="/api-documentation" className="hover:text-gray-600 block py-2">API</Link>
              <Link to="/contact-sales" className="hover:text-gray-600 block py-2">Contact Sales</Link>
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="hover:text-gray-600 block py-2">Dashboard</Link>
                  <Button onClick={handleLogout} variant="outline" className="w-full">Logout</Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="block py-2">
                    <Button variant="ghost" className="w-full">Login</Button>
                  </Link>
                  <Link to="/register" className="block py-2">
                    <Button className="w-full">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default Navbar;
