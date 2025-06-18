import React, { useState } from 'react';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { FAQ } from '@/types';

const Faq = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  
  const faqItems: FAQ[] = [
    {
      id: '1',
      question: 'How does AI Voice Caller work?',
      answer: 'AI Voice Caller combines three key technologies: TTS (Text-to-Speech) to generate human-like voice from text, STT (Speech-to-Text) to convert spoken words into text, and LLM (Large Language Models) to power natural conversations. When a call is initiated, our system establishes a connection via SignalWire, enabling the AI to speak, listen, understand, and respond in real-time.',
      category: 'general',
    },
    {
      id: '2',
      question: 'What types of calls can the AI handle?',
      answer: 'Our AI Voice Caller can handle a variety of call types including sales outreach, appointment reminders, customer follow-ups, surveys and feedback collection, lead qualification, and routine notifications. The system can be trained for your specific use case to ensure optimal performance.',
      category: 'general',
    },
    {
      id: '3',
      question: 'How natural does the AI voice sound?',
      answer: 'Our AI voices are designed to sound highly natural. We use advanced TTS technology from providers like Deepgram and ElevenLabs to create voices with natural intonation, pacing, and emotion. Many users report that the AI voices are indistinguishable from human voices in most conversations.',
      category: 'technology',
    },
    {
      id: '4',
      question: 'What languages are supported?',
      answer: 'Currently, our system supports English (US, UK, Australian, Indian), Spanish, French, German, Italian, Portuguese, Japanese, and Mandarin Chinese. We\'re constantly adding support for more languages and regional accents.',
      category: 'technology',
    },
    {
      id: '5',
      question: 'How much does it cost?',
      answer: 'Our pricing is based on call volume with plans starting at $49/month for up to 500 minutes. We offer a free tier for up to 50 minutes per month so you can test the system. Custom enterprise plans are available for high-volume users. Please visit our pricing page for detailed information.',
      category: 'pricing',
    },
    {
      id: '6',
      question: 'Can the AI transfer calls to a human agent?',
      answer: 'Yes, our AI Voice Caller includes a live transfer feature. The AI can recognize when a human agent is needed and seamlessly transfer the call to an available representative. You can set specific triggers that will initiate a transfer.',
      category: 'features',
    },
    {
      id: '7',
      question: 'How does the AI handle complex conversations?',
      answer: 'Our AI is powered by advanced large language models that can understand context, remember previous parts of the conversation, and handle unexpected responses. While it excels in structured conversations, it can also adapt to many unscripted scenarios. The AI continuously improves through training and feedback.',
      category: 'technology',
    },
    {
      id: '8',
      question: 'Are calls recorded and transcribed?',
      answer: 'Yes, all calls can be recorded and transcribed by default, though this is configurable. Recordings and transcriptions are stored securely in your account and can be accessed for review, training purposes, or compliance requirements.',
      category: 'security',
    },
    {
      id: '9',
      question: 'Is the service compliant with privacy regulations?',
      answer: 'Yes, we designed our platform with privacy in mind. We comply with GDPR, CCPA, and other relevant privacy regulations. We recommend informing call recipients that they are speaking with an AI system to meet disclosure requirements in your jurisdiction.',
      category: 'security',
    },
    {
      id: '10',
      question: 'Can I customize the AI voice and personality?',
      answer: 'Absolutely! You can choose from various voice options and adjust parameters like speech rate, pitch, and style. You can also customize the AI\'s personality, tone, and conversation style to match your brand and use case.',
      category: 'features',
    },
    {
      id: '11',
      question: 'How do I get started?',
      answer: 'Getting started is easy! Simply sign up for a free account, upload your contact list, create a script or use one of our templates, and launch your first campaign. Our onboarding process guides you through each step, and our support team is available to help if needed.',
      category: 'general',
    },
    {
      id: '12',
      question: 'What telephony provider does the system use?',
      answer: 'We exclusively use SignalWire.com for our telephony infrastructure. SignalWire provides reliable, carrier-grade voice capabilities with excellent call quality and global coverage at competitive rates.',
      category: 'technology',
    },
  ];
  
  const categories = ['all', 'general', 'technology', 'features', 'pricing', 'security'];
  
  const filteredFaqs = activeCategory === 'all' 
    ? faqItems 
    : faqItems.filter(faq => faq.category === activeCategory);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Frequently Asked Questions</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Get answers to common questions about our AI Voice Caller technology and service
            </p>
          </div>
          
          {/* Category filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {categories.map(category => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full transition-colors ${
                  activeCategory === category
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
          
          {/* FAQ items */}
          <div className="max-w-3xl mx-auto">
            {filteredFaqs.map((faq) => (
              <FAQItem key={faq.id} faq={faq} />
            ))}
          </div>
          
          {/* Still have questions */}
          <div className="mt-16 bg-indigo-50 rounded-lg p-8 text-center max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Still have questions?</h2>
            <p className="text-lg mb-6">
              Our team is ready to help you implement AI Voice Caller for your specific needs
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a 
                href="mailto:support@aivoicecaller.com" 
                className="bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Contact Support
              </a>
              <a 
                href="/documentation" 
                className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md hover:bg-indigo-50 transition-colors"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

interface FAQItemProps {
  faq: FAQ;
}

const FAQItem = ({ faq }: FAQItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mb-6 border-b border-gray-200 pb-6 last:border-0">
      <button 
        className="flex justify-between items-center w-full text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-xl font-medium pr-8">{faq.question}</h3>
        <span className="text-indigo-600 transition-transform duration-200 transform">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      
      {isOpen && (
        <p className="mt-4 text-gray-600 pr-6">
          {faq.answer}
        </p>
      )}
    </div>
  );
};

export default Faq;
