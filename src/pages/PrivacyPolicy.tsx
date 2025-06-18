
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';

const PrivacyPolicy = () => {
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
          
          <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-4">Last Updated: May 21, 2025</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. Introduction</h2>
            <p>AIVoiceCaller ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our AI voice calling services.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. Information We Collect</h2>
            <p>We may collect the following types of information:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2"><strong>Personal Information:</strong> Name, email address, phone number, and billing information.</li>
              <li className="mb-2"><strong>Call Data:</strong> Call recordings, transcripts, duration, and metadata.</li>
              <li className="mb-2"><strong>Usage Information:</strong> How you interact with our platform and services.</li>
              <li className="mb-2"><strong>Technical Data:</strong> IP address, browser type, device information, and cookies.</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. How We Use Your Information</h2>
            <p>We use your information for the following purposes:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">To provide and maintain our services</li>
              <li className="mb-2">To improve and personalize your experience</li>
              <li className="mb-2">To process payments and billing</li>
              <li className="mb-2">To communicate with you about our services</li>
              <li className="mb-2">To analyze usage patterns and trends</li>
              <li className="mb-2">To comply with legal obligations</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Data Retention</h2>
            <p>We retain your information for as long as your account is active or as needed to provide you services. We may also retain and use your information as necessary to comply with legal obligations, resolve disputes, and enforce our agreements.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Information Sharing</h2>
            <p>We may share your information with:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Service providers who perform services on our behalf</li>
              <li className="mb-2">Business partners with your consent</li>
              <li className="mb-2">Legal authorities when required by law</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Your Rights</h2>
            <p>Depending on your location, you may have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Access your personal information</li>
              <li className="mb-2">Correct inaccurate information</li>
              <li className="mb-2">Delete your information</li>
              <li className="mb-2">Object to or restrict certain processing</li>
              <li className="mb-2">Data portability</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Security</h2>
            <p>We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">8. Changes to This Policy</h2>
            <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">9. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us at:</p>
            <p>Email: privacy@aivoicecaller.com</p>
            <p>Address: 123 AI Boulevard, San Francisco, CA 94103, United States</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
