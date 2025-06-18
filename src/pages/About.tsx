import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { Button } from '@/components/ui/button';

const About = () => {
  const navigate = useNavigate();
  
  const teamMembers = [
    {
      name: 'Raja Moid',
      title: 'CEO & Co-Founder',
      image: '/team-raja.jpg',
      bio: 'Raja is a visionary entrepreneur in his early 30s with over 10 years of experience in AI and telecommunications. He previously led AI product development at a Fortune 500 tech company before co-founding AIVoiceCaller to democratize AI voice technology for businesses worldwide.',
    },
    {
      name: 'Dr. Zara Ahmed',
      title: 'CTO & Co-Founder',
      image: '/team-zara.jpg',
      bio: 'Dr. Zara is an expert in speech recognition and natural language processing with a Ph.D. in Computer Science from LUMS. She has published numerous papers on conversational AI and leads our technical innovation at AIVoiceCaller.',
    },
    {
      name: 'Hassan Ali',
      title: 'Head of Product',
      image: '/team-hassan.jpg',
      bio: 'Hassan brings a decade of product management experience from leading SaaS companies in Pakistan and the UAE. He is passionate about creating intuitive user experiences that solve real business problems for our diverse clientele.',
    },
    {
      name: 'Amna Siddiqui',
      title: 'Lead AI Engineer',
      image: '/team-amna.jpg',
      bio: 'Amna specializes in machine learning and voice synthesis. She previously worked at one of Pakistan\'s leading AI research labs, focusing on natural language generation and multilingual voice processing.',
    },
    {
      name: 'Omar Khan',
      title: 'Head of Sales',
      image: '/team-omar.jpg',
      bio: 'Omar leads our sales team with over 8 years of experience in B2B sales across South Asia. He understands the unique challenges faced by businesses in emerging markets and helps them leverage AI to compete globally.',
    },
    {
      name: 'Sana Malik',
      title: 'Customer Success Manager',
      image: '/team-sana.jpg',
      bio: 'Sana ensures our customers achieve maximum value from AIVoiceCaller. With experience in customer success at multiple tech startups, she builds lasting relationships and drives product adoption across diverse industries.',
    },
  ];
  
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16">
        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Our Mission</h1>
            <p className="text-xl text-gray-600 mb-8">
              We're building the future of business communication by making AI voice technology accessible, 
              affordable, and effective for businesses of all sizes across Pakistan and beyond.
            </p>
          </div>
        </div>
        
        {/* Our Story */}
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="prose prose-lg">
                <p>
                  AIVoiceCaller was founded in 2021 by Raja Moid and Dr. Zara Ahmed in Lahore, Pakistan. They met while working on voice AI technologies and were inspired by the potential to transform how Pakistani businesses communicate with their customers.
                </p>
                <p>
                  They recognized that while large multinational companies had access to cutting-edge AI voice solutions, small and medium-sized businesses in Pakistan and other emerging markets were left with outdated automated systems that customers found frustrating and impersonal.
                </p>
                <p>
                  Raja and Zara believed that every business, regardless of size or location, deserved access to natural-sounding, intelligent voice AI that could handle real conversations in multiple languages including Urdu, English, and other regional languages.
                </p>
                <p>
                  With initial funding from Pakistani and international investors, they assembled a talented team of AI engineers, product specialists, and business development professionals. The platform launched in early 2022 and has since helped hundreds of businesses across South Asia transform their calling operations with AI.
                </p>
                <p>
                  Today, AIVoiceCaller is the leading AI voice calling platform for businesses in Pakistan, known for its natural-sounding voices, intelligent conversation capabilities, cultural sensitivity, and ease of use. We're proud to be contributing to Pakistan's growing tech ecosystem while serving businesses globally.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Our Team */}
        <div className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                We're a diverse team of AI experts, engineers, and business leaders passionate about voice technology and serving businesses across Pakistan and beyond
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="h-64 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                    <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-indigo-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg">{member.name}</h3>
                    <p className="text-indigo-600 mb-4">{member.title}</p>
                    <p className="text-gray-600 text-sm">{member.bio}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Our Investors */}
        <div className="bg-gray-50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Backed By Leading Investors</h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                We're supported by prominent Pakistani and international investors who believe in our vision
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-12">
              <div className="w-32 h-32 bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bold text-indigo-600">Lakson Ventures</div>
                  <div className="text-sm text-gray-500">Lead Investor</div>
                </div>
              </div>
              <div className="w-32 h-32 bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bold text-indigo-600">Oraan</div>
                  <div className="text-sm text-gray-500">Strategic Partner</div>
                </div>
              </div>
              <div className="w-32 h-32 bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bold text-indigo-600">i2i Ventures</div>
                  <div className="text-sm text-gray-500">Series A</div>
                </div>
              </div>
              <div className="w-32 h-32 bg-white rounded-lg shadow flex items-center justify-center">
                <div className="text-center">
                  <div className="font-bold text-indigo-600">Fatima Ventures</div>
                  <div className="text-sm text-gray-500">Growth Partner</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Contact CTA */}
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to work with us?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Join the hundreds of businesses already transforming their calling operations with our AI voice technology.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              size="lg" 
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate('/dashboard')}
            >
              Get Started Free
            </Button>
            <Button 
              size="lg"
              variant="outline" 
              className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              onClick={() => navigate('/contact-sales')}
            >
              Contact Sales Team
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default About;
