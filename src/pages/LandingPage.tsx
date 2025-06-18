
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  Phone, 
  Zap, 
  Shield, 
  Users, 
  BarChart3,
  CheckCircle,
  Star,
  PlayCircle,
  MessageSquare,
  Brain,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import HeroAnimation from '@/components/Landing/HeroAnimation';
import Testimonials from '@/components/Landing/Testimonials';

const LandingPage = () => {
  const features = [
    {
      icon: Brain,
      title: "Advanced AI Models",
      description: "Powered by state-of-the-art language models for natural conversations"
    },
    {
      icon: Mic,
      title: "Real-time Voice Processing",
      description: "Low-latency speech-to-text and text-to-speech for seamless interactions"
    },
    {
      icon: Phone,
      title: "Outbound Calling",
      description: "Automated outbound campaigns with intelligent conversation flows"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-grade security with SOC2 compliance and data encryption"
    },
    {
      icon: BarChart3,
      title: "Analytics & Insights",
      description: "Comprehensive analytics to track performance and optimize results"
    },
    {
      icon: Zap,
      title: "Easy Integration",
      description: "Simple APIs and webhooks for seamless integration with your systems"
    }
  ];

  const useCases = [
    {
      icon: Users,
      title: "Customer Support",
      description: "Handle customer inquiries 24/7 with intelligent AI agents"
    },
    {
      icon: MessageSquare,
      title: "Sales Outreach",
      description: "Qualify leads and book appointments automatically"
    },
    {
      icon: Clock,
      title: "Appointment Scheduling",
      description: "Automate scheduling and reduce no-shows"
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 to-indigo-100 py-20 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge variant="secondary" className="mb-4">
                🚀 Now in Public Beta
              </Badge>
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                AI Voice Agents That Actually
                <span className="text-blue-600"> Work</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Deploy intelligent voice assistants that handle calls, answer questions, 
                and engage customers naturally. No more robotic interactions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link to="/register">
                    Start Free Trial
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Watch Demo
                </Button>
              </div>
              <div className="flex items-center gap-6 mt-8">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="text-gray-600">Trusted by 500+ businesses</span>
              </div>
            </div>
            <div className="lg:block hidden">
              <HeroAnimation />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need for Voice AI
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides all the tools you need to create, deploy, and manage 
              intelligent voice assistants.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-600 mb-4" />
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Endless Possibilities
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              See how businesses across industries are using our voice AI platform.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <useCase.icon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-xl">{useCase.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{useCase.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials />

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of companies already using our voice AI platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link to="/register">
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-blue-600">
              Contact Sales
            </Button>
          </div>
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>No Setup Fees</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>Cancel Anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span>24/7 Support</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
