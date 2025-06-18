
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';
import { Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';

const Documentation = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const docCategories = [
    {
      title: 'Getting Started',
      icon: '🚀',
      items: [
        { title: 'Introduction to AI Voice Caller', link: '/documentation/intro' },
        { title: 'Quick Start Guide', link: '/documentation/quickstart' },
        { title: 'Creating Your First Campaign', link: '/documentation/first-campaign' },
        { title: 'Account Setup', link: '/documentation/account-setup' },
      ]
    },
    {
      title: 'Voice AI Technology',
      icon: '🗣️',
      items: [
        { title: 'How Our AI Voice Works', link: '/documentation/ai-voice' },
        { title: 'Voice Training & Customization', link: '/documentation/voice-customization' },
        { title: 'Languages & Accents', link: '/documentation/languages' },
        { title: 'Voice Analytics', link: '/documentation/voice-analytics' },
      ]
    },
    {
      title: 'Campaign Management',
      icon: '📊',
      items: [
        { title: 'Creating Effective Scripts', link: '/documentation/scripts' },
        { title: 'Campaign Settings', link: '/documentation/campaign-settings' },
        { title: 'Scheduling Calls', link: '/documentation/scheduling' },
        { title: 'Contact Management', link: '/documentation/contacts' },
      ]
    },
    {
      title: 'Call Center',
      icon: '☎️',
      items: [
        { title: 'Live Call Monitoring', link: '/documentation/call-monitoring' },
        { title: 'Agent Transfer Protocol', link: '/documentation/agent-transfer' },
        { title: 'Call Recording & Analysis', link: '/documentation/call-recording' },
        { title: 'Quality Assurance', link: '/documentation/quality-assurance' },
      ]
    },
    {
      title: 'Integration & API',
      icon: '🔌',
      items: [
        { title: 'API Documentation', link: '/documentation/api' },
        { title: 'CRM Integrations', link: '/documentation/crm-integrations' },
        { title: 'Webhooks', link: '/documentation/webhooks' },
        { title: 'Custom Integrations', link: '/documentation/custom-integrations' },
      ]
    },
    {
      title: 'Security & Compliance',
      icon: '🔒',
      items: [
        { title: 'Data Security', link: '/documentation/data-security' },
        { title: 'Compliance Guidelines', link: '/documentation/compliance' },
        { title: 'Privacy Best Practices', link: '/documentation/privacy' },
        { title: 'Regulatory Information', link: '/documentation/regulatory' },
      ]
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-gray-50 py-12 flex-grow">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Documentation</h1>
            <p className="text-xl text-gray-600 mb-8">
              Everything you need to know about using the AIVoiceCaller platform.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search documentation..."
                className="pl-10 py-6 text-lg"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {docCategories.map((category, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="p-6">
                    <div className="text-3xl mb-3">{category.icon}</div>
                    <h2 className="text-xl font-bold mb-4">{category.title}</h2>
                    <ul className="space-y-2">
                      {category.items.map((item, idx) => (
                        <li key={idx}>
                          <Link 
                            to={item.link} 
                            className="flex items-center text-gray-700 hover:text-indigo-600 py-1"
                          >
                            <ChevronRight className="h-4 w-4 mr-1" />
                            <span>{item.title}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-gray-50 px-6 py-3 border-t">
                    <Link 
                      to={`/documentation/${category.title.toLowerCase().replace(/\s+/g, '-')}`} 
                      className="text-indigo-600 font-medium hover:underline text-sm"
                    >
                      View all {category.title} docs →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-16 bg-indigo-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Need more help?</h2>
              <p className="text-lg text-gray-700 mb-6">Our support team is ready to assist with any questions.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  to="/contact" 
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                >
                  Contact Support
                </Link>
                <Link 
                  to="/faq" 
                  className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-indigo-50 transition-colors"
                >
                  Visit FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Documentation;
