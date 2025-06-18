import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* First Section - Logo and Description */}
          <div>
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              AIVoiceCaller
            </Link>
            <p className="text-gray-600 mt-4">
              AI-powered voice solutions for businesses of all sizes.
            </p>
          </div>

          {/* Second Section - Company */}
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Company</h4>
            <ul className="text-gray-600">
              <li className="mb-2">
                <Link to="/about" className="hover:text-indigo-600">
                  About Us
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/case-studies" className="hover:text-indigo-600">
                  Case Studies
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/blog" className="hover:text-indigo-600">
                  Blog
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/contact-sales" className="hover:text-indigo-600">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Third Section - Resources */}
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Resources</h4>
            <ul className="text-gray-600">
              <li className="mb-2">
                <Link to="/api-documentation" className="hover:text-indigo-600">
                  API Documentation
                </Link>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Support
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Privacy Policy
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Fourth Section - Connect */}
          <div>
            <h4 className="font-bold text-gray-800 mb-2">Connect</h4>
            <ul className="text-gray-600">
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Facebook
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Twitter
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  LinkedIn
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="hover:text-indigo-600">
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section - Copyright */}
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            &copy; {new Date().getFullYear()} AIVoiceCaller. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
