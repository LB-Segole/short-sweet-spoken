
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MessageCircle, Clock, MapPin } from 'lucide-react';

const ContactSales = () => {
  const navigate = useNavigate();

  const salesTeam = [
    {
      id: 'ahmed-hassan',
      name: 'Ahmed Hassan',
      title: 'Senior Sales Manager',
      email: 'ahmed.hassan@aivoicecaller.com',
      phone: '+92 300 1234567',
      image: '/team-ahmed.jpg',
      specialization: 'Enterprise Solutions & Custom Integrations',
      languages: ['English', 'Urdu', 'Hindi'],
      experience: '8+ years in AI technology sales'
    },
    {
      id: 'fatima-ali',
      name: 'Fatima Ali',
      title: 'Business Development Executive',
      email: 'fatima.ali@aivoicecaller.com',
      phone: '+92 321 2345678',
      image: '/team-fatima.jpg',
      specialization: 'Small to Medium Business Solutions',
      languages: ['English', 'Urdu'],
      experience: '5+ years in business development'
    },
    {
      id: 'usman-malik',
      name: 'Usman Malik',
      title: 'Technical Sales Consultant',
      email: 'usman.malik@aivoicecaller.com',
      phone: '+92 333 3456789',
      image: '/team-usman.jpg',
      specialization: 'API Integrations & Technical Solutions',
      languages: ['English', 'Urdu'],
      experience: '6+ years in technical sales'
    },
    {
      id: 'ayesha-khan',
      name: 'Ayesha Khan',
      title: 'Customer Success Manager',
      email: 'ayesha.khan@aivoicecaller.com',
      phone: '+92 345 4567890',
      image: '/team-ayesha.jpg',
      specialization: 'Customer Onboarding & Success',
      languages: ['English', 'Urdu', 'Punjabi'],
      experience: '4+ years in customer success'
    }
  ];

  const handleStartChat = (teamMember: typeof salesTeam[0]) => {
    // Simulate starting a chat
    alert(`Starting chat with ${teamMember.name}...\n\nHi! I'm ${teamMember.name}, your ${teamMember.title}. How can I help you today?\n\nSpecialization: ${teamMember.specialization}\nLanguages: ${teamMember.languages.join(', ')}`);
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}?subject=Inquiry about AIVoiceCaller`, '_self');
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">Contact Our Sales Team</h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Speak directly with our experienced sales professionals who understand your business needs.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-lg mx-auto">
              <div className="flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-800">Available Monday - Friday</span>
              </div>
              <p className="text-blue-700">8:00 AM - 6:00 PM (Pakistan Standard Time)</p>
            </div>
          </div>

          {/* Office Information */}
          <div className="bg-gray-50 rounded-lg p-8 mb-16 text-center">
            <h2 className="text-2xl font-bold mb-4">Our Lahore Office</h2>
            <div className="flex items-center justify-center mb-4">
              <MapPin className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-gray-700">
                Floor 3, Arfa Software Technology Park, Ferozepur Road, Lahore, Punjab 54600, Pakistan
              </span>
            </div>
            <div className="flex items-center justify-center">
              <Phone className="h-5 w-5 text-gray-600 mr-2" />
              <span className="text-gray-700">Main Office: +92 42 1234 5678</span>
            </div>
          </div>
          
          {/* Sales Team */}
          <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8 mb-16">
            {salesTeam.map((member) => (
              <Card key={member.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-indigo-600">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{member.name}</CardTitle>
                      <p className="text-indigo-600 font-medium">{member.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{member.experience}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Specialization</h4>
                    <p className="text-gray-600 text-sm">{member.specialization}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Languages</h4>
                    <p className="text-gray-600 text-sm">{member.languages.join(', ')}</p>
                  </div>
                  
                  <div className="flex flex-col space-y-2 pt-4 border-t">
                    <Button
                      onClick={() => handleStartChat(member)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Start Chat
                    </Button>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        onClick={() => handleCall(member.phone)}
                        className="text-sm"
                      >
                        <Phone className="h-4 w-4 mr-1" />
                        Call
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleEmail(member.email)}
                        className="text-sm"
                      >
                        <Mail className="h-4 w-4 mr-1" />
                        Email
                      </Button>
                    </div>
                    
                    <div className="space-y-1 text-xs text-gray-500">
                      <p className="flex items-center">
                        <Phone className="h-3 w-3 mr-1" />
                        {member.phone}
                      </p>
                      <p className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {member.email}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* General Contact Options */}
          <div className="bg-indigo-50 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Need Immediate Assistance?</h2>
            <p className="text-gray-600 mb-6">
              Can't find the right person? Contact our general sales line and we'll connect you with the perfect specialist.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                onClick={() => handleCall('+92 42 1234 5678')}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Phone className="h-5 w-5 mr-2" />
                Call Sales: +92 42 1234 5678
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => handleEmail('sales@aivoicecaller.com')}
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                <Mail className="h-5 w-5 mr-2" />
                Email: sales@aivoicecaller.com
              </Button>
            </div>
          </div>

          {/* Back to main site */}
          <div className="text-center mt-12">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-gray-300"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ContactSales;
