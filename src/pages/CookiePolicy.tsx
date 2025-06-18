
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';

const CookiePolicy = () => {
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
          
          <h1 className="text-3xl font-bold mb-8">Cookie Policy</h1>
          
          <div className="prose max-w-none">
            <p className="text-lg mb-4">Last Updated: May 21, 2025</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">1. What Are Cookies</h2>
            <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the website owners.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">2. How We Use Cookies</h2>
            <p>AIVoiceCaller uses cookies and similar technologies to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Ensure the website functions properly</li>
              <li className="mb-2">Remember your preferences and settings</li>
              <li className="mb-2">Understand how you use our website</li>
              <li className="mb-2">Improve your user experience</li>
              <li className="mb-2">Personalize content and advertisements</li>
              <li className="mb-2">Analyze website traffic and performance</li>
            </ul>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">3. Types of Cookies We Use</h2>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Essential Cookies</h3>
            <p>These cookies are necessary for the website to function properly. They enable core functionality such as security, network management, and account access. You cannot opt out of these cookies.</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Functional Cookies</h3>
            <p>These cookies enable us to provide enhanced functionality and personalization. They may be set by us or by third-party providers whose services we have added to our pages.</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Performance/Analytics Cookies</h3>
            <p>These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously. They help us improve the way our website works.</p>
            
            <h3 className="text-xl font-semibold mt-6 mb-2">Targeting/Advertising Cookies</h3>
            <p>These cookies are used to deliver advertisements more relevant to you and your interests. They may be used to limit the number of times you see an advertisement and measure the effectiveness of advertising campaigns.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">4. Cookie Management</h2>
            <p>You can control and manage cookies in various ways. Most web browsers allow you to manage your cookie preferences. You can:</p>
            <ul className="list-disc pl-6 mb-4">
              <li className="mb-2">Delete cookies from your hard drive</li>
              <li className="mb-2">Block cookies by activating the setting on your browser that allows you to refuse all or some cookies</li>
              <li className="mb-2">Set your browser to notify you when you receive a cookie</li>
            </ul>
            <p>Please note that if you choose to block or delete cookies, you may not be able to access certain areas or features of our website, and some services may not function properly.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">5. Third-Party Cookies</h2>
            <p>We may allow third parties to place cookies on your device for the purposes described in this policy. These third parties may include analytics providers, advertising networks, and social media platforms.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">6. Changes to This Policy</h2>
            <p>We may update our Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">7. Contact Us</h2>
            <p>If you have any questions about our Cookie Policy, please contact us at:</p>
            <p>Email: privacy@aivoicecaller.com</p>
            <p>Address: 123 AI Boulevard, San Francisco, CA 94103, United States</p>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default CookiePolicy;
