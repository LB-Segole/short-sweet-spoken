
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Phone, Search } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-lg">
        <div className="relative">
          <div className="text-[150px] font-bold text-indigo-600 leading-none">404</div>
          <div className="absolute top-1/2 right-0 transform -translate-y-1/2 -translate-x-8">
            <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center">
              <Search className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold mt-8 mb-4">Page Not Found</h1>
        <p className="text-gray-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
          Let's get you back on track!
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link to="/">
              <Home className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <Button variant="outline" asChild>
            <Link to="/contact">
              <Phone className="mr-2 h-4 w-4" />
              Contact Support
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
