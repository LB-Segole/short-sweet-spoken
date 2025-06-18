
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { Button } from '@/components/ui/button';
import { Check, HelpCircle } from 'lucide-react';

const Pricing = () => {
  const navigate = useNavigate();
  
  const payAsYouGoPricing = [
    {
      id: 'basic-calls',
      name: 'Basic Calls',
      price: 0.15,
      unit: 'per minute',
      features: [
        'Standard AI voice quality',
        'Basic call analytics',
        'Email support',
        'Call recording',
        'Standard response time',
      ],
      description: 'Perfect for small businesses getting started',
    },
    {
      id: 'premium-calls',
      name: 'Premium Calls',
      price: 0.25,
      unit: 'per minute',
      features: [
        'High-quality AI voices',
        'Advanced call analytics',
        'Priority support',
        'Call recording & transcription',
        'Real-time monitoring',
        'Custom voice training',
        'Webhook integrations',
      ],
      description: 'Best for growing businesses',
      isPopular: true,
    },
    {
      id: 'enterprise-calls',
      name: 'Enterprise Calls',
      price: 0.40,
      unit: 'per minute',
      features: [
        'Ultra-premium AI voices',
        'Enterprise analytics & reporting',
        'Dedicated account manager',
        'Custom AI voice creation',
        'API access',
        'Advanced security features',
        'Custom integrations',
        'SLA guarantees',
        'White-label options',
      ],
      description: 'For large-scale operations',
    },
  ];

  const volumeDiscounts = [
    { minutes: '0-1,000', discount: '0%', description: 'Standard rates apply' },
    { minutes: '1,001-5,000', discount: '5%', description: 'Small volume discount' },
    { minutes: '5,001-20,000', discount: '10%', description: 'Medium volume discount' },
    { minutes: '20,001+', discount: '15%', description: 'Large volume discount' },
  ];
  
  const faqs = [
    {
      question: 'How does pay-as-you-go pricing work?',
      answer: 'You only pay for the actual call minutes you use. No monthly commitments, no unused minute waste. We charge per minute based on the tier you choose, with volume discounts available.',
    },
    {
      question: 'What are volume discounts?',
      answer: 'The more minutes you use per month, the bigger discount you get on your per-minute rate. Discounts are automatically applied to your monthly bill based on your usage.',
    },
    {
      question: 'Is there a minimum charge?',
      answer: 'No minimum charge! You can start with as little as one call. We only bill you for what you actually use.',
    },
    {
      question: 'When am I charged?',
      answer: 'We bill monthly for your usage. You receive a detailed invoice showing all calls made, duration, and rates applied.',
    },
    {
      question: 'Can I switch between tiers?',
      answer: 'Yes! You can switch between Basic, Premium, and Enterprise tiers at any time. The new rate applies to calls made after the change.',
    },
    {
      question: 'Do you offer prepaid credits?',
      answer: 'Yes, you can purchase prepaid call credits at a discounted rate. Contact our sales team for prepaid options and bulk discounts.',
    },
  ];
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Pay-As-You-Go Pricing</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Only pay for what you use. No monthly fees, no commitments. Scale up or down as needed.
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-lg mx-auto">
              <p className="text-green-800 font-medium">🎉 New users get $10 in free credits to try our service!</p>
            </div>
          </div>
          
          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
            {payAsYouGoPricing.map((plan) => (
              <div 
                key={plan.id}
                className={`bg-white rounded-lg shadow-lg overflow-hidden relative border-2 ${
                  plan.isPopular ? 'border-indigo-500' : 'border-gray-200'
                }`}
              >
                {plan.isPopular && (
                  <div className="bg-indigo-600 text-white text-xs font-semibold px-3 py-1 absolute top-0 right-0 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-gray-600 mb-4">{plan.description}</p>
                  <div className="mb-6">
                    <span className="text-4xl font-bold text-indigo-600">${plan.price}</span>
                    <span className="text-gray-600 ml-1">{plan.unit}</span>
                  </div>
                  <Button
                    className={`w-full mb-6 ${
                      plan.isPopular ? 'bg-indigo-600 hover:bg-indigo-700' : ''
                    }`}
                    onClick={() => navigate('/dashboard')}
                  >
                    Start Using {plan.name}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          {/* Volume Discounts */}
          <div className="bg-gray-50 rounded-lg p-8 mb-16">
            <h2 className="text-2xl font-bold text-center mb-8">Volume Discounts</h2>
            <div className="grid md:grid-cols-4 gap-4">
              {volumeDiscounts.map((tier, index) => (
                <div key={index} className="bg-white rounded-lg p-4 text-center">
                  <div className="text-lg font-semibold text-indigo-600 mb-2">{tier.minutes}</div>
                  <div className="text-xl font-bold mb-1">{tier.discount}</div>
                  <div className="text-sm text-gray-600">{tier.description}</div>
                </div>
              ))}
            </div>
            <p className="text-center text-gray-600 mt-6">
              Volume discounts are automatically applied to your monthly bill
            </p>
          </div>
          
          {/* Enterprise CTA */}
          <div className="bg-indigo-50 rounded-lg p-8 text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-2xl font-bold mb-4">Need Custom Pricing?</h2>
            <p className="text-lg mb-6">
              For high-volume usage or custom requirements, we offer tailored pricing plans with additional discounts and dedicated support.
            </p>
            <Button
              size="lg"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate('/contact-sales')}
            >
              Contact Sales Team
            </Button>
          </div>
          
          {/* FAQs */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
            <div className="max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                <div key={index} className="mb-6 border-b border-gray-200 pb-6 last:border-0">
                  <div className="flex items-start">
                    <HelpCircle className="h-5 w-5 text-indigo-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-lg mb-2">{faq.question}</h3>
                      <p className="text-gray-600">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Pricing;
