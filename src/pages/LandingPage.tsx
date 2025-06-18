
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Phone, 
  Bot, 
  BarChart3, 
  Shield, 
  Clock, 
  Zap, 
  CheckCircle,
  ArrowRight,
  Star,
  Play
} from 'lucide-react';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import DemoCallModal from '@/components/Landing/DemoCallModal';
import PaymentModal from '@/components/Payment/PaymentModal';

const LandingPage = () => {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const features = [
    {
      icon: Bot,
      title: "AI Voice Agents",
      description: "Create intelligent voice agents that handle customer interactions with natural conversation flows and advanced AI capabilities."
    },
    {
      icon: Phone,
      title: "Automated Calling",
      description: "Scale your outreach with automated calling campaigns that deliver personalized messages at the perfect time."
    },
    {
      icon: BarChart3,
      title: "Real-time Analytics",
      description: "Track performance metrics, conversation insights, and ROI with comprehensive analytics and reporting tools."
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with SOC 2 compliance, data encryption, and privacy controls to protect your business data."
    },
    {
      icon: Clock,
      title: "24/7 Availability",
      description: "Your AI agents work around the clock, handling customer inquiries and generating leads even while you sleep."
    },
    {
      icon: Zap,
      title: "Instant Deployment",
      description: "Get started in minutes with our intuitive platform. No technical expertise required to create powerful voice agents."
    }
  ];

  const stats = [
    { value: "98%", label: "Customer Satisfaction" },
    { value: "3x", label: "Faster Response Time" },
    { value: "65%", label: "Cost Reduction" },
    { value: "24/7", label: "Availability" }
  ];

  const testimonials = [
    {
      content: "First Choice LLC's AI voice platform transformed our customer service. We've seen a 40% increase in customer satisfaction and our team can focus on high-value tasks.",
      author: "Sarah Johnson",
      role: "Customer Success Director",
      avatar: "/placeholder.svg"
    },
    {
      content: "The AI agents sound so natural, our customers often don't realize they're talking to AI. It's incredible technology that's boosted our sales by 35%.",
      author: "Michael Chen",
      role: "Sales Manager",
      avatar: "/placeholder.svg"
    },
    {
      content: "Implementation was seamless and the ROI was immediate. We're handling 3x more inquiries with the same team size. This platform is a game-changer.",
      author: "Emily Rodriguez",
      role: "Operations Director",
      avatar: "/placeholder.svg"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <Badge className="mb-4 bg-blue-100 text-blue-800 hover:bg-blue-200">
              🚀 Next-Generation Voice AI Platform
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Transform Your Business with
              <span className="text-blue-600"> AI Voice Agents</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Automate customer interactions, sales calls, and support with intelligent AI agents that sound natural and deliver results 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
                onClick={() => setShowPaymentModal(true)}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="px-8 py-3"
                onClick={() => setShowDemoModal(true)}
              >
                <Play className="mr-2 h-5 w-5" />
                Try Demo Call
              </Button>
            </div>

            <p className="text-sm text-gray-500 mt-4">
              30-day free trial • No credit card required • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl font-bold text-blue-600 mb-2">{stat.value}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for Voice AI Success
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Our comprehensive platform includes all the tools you need to create, deploy, and manage AI voice agents that deliver exceptional results.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-xl text-gray-600">
              See how businesses are transforming their operations with our AI voice platform
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-none shadow-lg">
                <CardContent className="pt-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6">"{testimonial.content}"</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="w-12 h-12 rounded-full mr-4"
                    />
                    <div>
                      <div className="font-semibold text-gray-900">{testimonial.author}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies using AI voice agents to automate calls, increase conversions, and scale their operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3"
              onClick={() => setShowPaymentModal(true)}
            >
              Start Free Trial Today
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-white text-white hover:bg-white hover:text-blue-600 px-8 py-3"
              onClick={() => setShowDemoModal(true)}
            >
              <Phone className="mr-2 h-5 w-5" />
              Get Demo Call
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      {/* Modals */}
      <DemoCallModal isOpen={showDemoModal} onClose={() => setShowDemoModal(false)} />
      <PaymentModal isOpen={showPaymentModal} onClose={() => setShowPaymentModal(false)} />
    </div>
  );
};

export default LandingPage;
