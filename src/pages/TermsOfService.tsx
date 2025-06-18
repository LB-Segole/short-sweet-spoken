
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';

const TermsOfService = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="container mx-auto px-4 py-12 flex-grow">
        <div className="max-w-4xl mx-auto">
          <Button variant="outline" asChild className="mb-6">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Link>
          </Button>
          
          <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-4">Last Updated: May 21, 2025</p>
            
            <p>These Terms of Service ("Terms") govern your use of the AIVoiceCaller platform and services. By using our services, you agree to these Terms.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Service Description</h2>
            <p>AIVoiceCaller provides AI-powered voice calling services that automate outbound and inbound calls for businesses. Our service includes AI agent technology, call management, analytics, and related tools.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Account Registration</h2>
            <p>To use our services, you must create an account. You agree to provide accurate information and are responsible for maintaining the confidentiality of your account credentials. You are responsible for all activities under your account.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Subscription and Payments</h2>
            <p>Our services are offered on a subscription basis. You agree to pay all fees according to your selected plan. All payments are non-refundable unless otherwise specified. We may change our fees with 30 days' notice.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Acceptable Use</h2>
            <p>You agree to use our services only for lawful purposes and in accordance with these Terms. You shall not:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Use the service for spam, harassment, or any illegal activities</li>
              <li className="mb-2">Attempt to bypass any usage limitations or restrictions</li>
              <li className="mb-2">Reverse engineer or attempt to extract the source code of our software</li>
              <li className="mb-2">Use the service to store or transmit harmful code</li>
              <li className="mb-2">Impersonate any person or entity</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Intellectual Property</h2>
            <p>AIVoiceCaller and its licensors own all right, title, and interest in the service, including all intellectual property rights. Nothing in these Terms grants you any right to use our trademarks, logos, domain names, or other brand features.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Compliance with Laws</h2>
            <p>You are responsible for complying with all applicable laws and regulations, including telemarketing laws, consent requirements, and data protection regulations.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Limitation of Liability</h2>
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIVOICECALLER SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Indemnification</h2>
            <p>You agree to indemnify, defend, and hold harmless AIVoiceCaller from and against all claims, liabilities, damages, losses, costs, expenses, and fees arising from your use of the service or violation of these Terms.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Termination</h2>
            <p>We may terminate or suspend your account for any reason, including violation of these Terms. Upon termination, your right to use the service will immediately cease.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">10. Changes to Terms</h2>
            <p>We may modify these Terms at any time by posting the revised Terms on our website. Your continued use of the service after such changes constitutes acceptance of the new Terms.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">11. Contact Us</h2>
            <p>If you have any questions about these Terms, please contact us at:</p>
            <p>Email: legal@aivoicecaller.com</p>
            <p>Address: 123 AI Boulevard, San Francisco, CA 94103, United States</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default TermsOfService;
