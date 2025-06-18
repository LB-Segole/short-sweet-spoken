
import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Twitter, Facebook, Linkedin, Github } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">AIVoiceCaller</h3>
            <p className="mb-4">
              Automating business calls with advanced AI technology from Pakistan to the world. 
              Transform your outbound and inbound calling with our intelligent voice agents.
            </p>
            <div className="flex space-x-4">
              <a href="https://twitter.com/aivoicecaller" className="hover:text-indigo-400" aria-label="Twitter">
                <Twitter size={20} />
              </a>
              <a href="https://facebook.com/aivoicecaller" className="hover:text-indigo-400" aria-label="Facebook">
                <Facebook size={20} />
              </a>
              <a href="https://linkedin.com/company/aivoicecaller" className="hover:text-indigo-400" aria-label="LinkedIn">
                <Linkedin size={20} />
              </a>
              <a href="https://github.com/aivoicecaller" className="hover:text-indigo-400" aria-label="GitHub">
                <Github size={20} />
              </a>
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-indigo-400">About Us</Link></li>
              <li><Link to="/pricing" className="hover:text-indigo-400">Pricing</Link></li>
              <li><Link to="/faq" className="hover:text-indigo-400">FAQ</Link></li>
              <li><Link to="/contact-sales" className="hover:text-indigo-400">Contact Sales</Link></li>
              <li><Link to="/dashboard" className="hover:text-indigo-400">Get Started</Link></li>
            </ul>
          </div>
          
          {/* Resources */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><Link to="/blog" className="hover:text-indigo-400">Blog</Link></li>
              <li><Link to="/documentation" className="hover:text-indigo-400">Documentation</Link></li>
              <li><Link to="/api-documentation" className="hover:text-indigo-400">API</Link></li>
              <li><Link to="/tutorials" className="hover:text-indigo-400">Tutorials</Link></li>
              <li><Link to="/case-studies" className="hover:text-indigo-400">Case Studies</Link></li>
            </ul>
          </div>
          
          {/* Contact */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center">
                <Phone size={18} className="mr-3" />
                <span>+92 42 1234 5678</span>
              </li>
              <li className="flex items-center">
                <Mail size={18} className="mr-3" />
                <a href="mailto:info@aivoicecaller.com" className="hover:text-indigo-400">info@aivoicecaller.com</a>
              </li>
              <li className="flex items-start">
                <MapPin size={18} className="mr-3 mt-1" />
                <span>
                  Floor 3, Arfa Software Technology Park<br />
                  Ferozepur Road, Lahore<br />
                  Punjab 54600, Pakistan
                </span>
              </li>
            </ul>
          </div>
        </div>
        
        <hr className="border-gray-700 my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p>&copy; {new Date().getFullYear()} AIVoiceCaller Pakistan. All rights reserved.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/privacy-policy" className="hover:text-indigo-400">Privacy Policy</Link>
            <Link to="/terms-of-service" className="hover:text-indigo-400">Terms of Service</Link>
            <Link to="/cookie-policy" className="hover:text-indigo-400">Cookie Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
