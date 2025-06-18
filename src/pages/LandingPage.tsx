import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Clock,
  Users,
  TrendingUp,
  Star,
  ArrowRight,
  Mic,
  MessageSquare,
  BarChart3,
  Shield
} from 'lucide-react';

const LandingPage = () => {
  const [stats] = useState([
    {
      title: 'Calls Made',
      value: '4,587',
      icon: Phone,
      description: 'Total number of calls made through the platform',
    },
    {
      title: 'Active Users',
      value: '1,245',
      icon: Users,
      description: 'Number of users actively using the platform',
    },
    {
      title: 'Customer Satisfaction',
      value: '4.8',
      icon: Star,
      description: 'Average customer satisfaction rating (out of 5)',
    },
    {
      title: 'Call Duration',
      value: '3:45',
      icon: Clock,
      description: 'Average call duration in minutes',
    },
  ]);

  const [features] = useState([
    {
      title: 'AI-Powered Voice Agents',
      description:
        'Create intelligent voice agents that can handle customer inquiries, automate sales calls, and more.',
      icon: Mic,
    },
    {
      title: 'Real-Time Analytics',
      description:
        'Track key metrics such as call volume, customer satisfaction, and agent performance in real-time.',
      icon: BarChart3,
    },
    {
      title: 'Secure and Reliable',
      description:
        'Our platform is built with security in mind, ensuring that your data is always safe and protected.',
      icon: Shield,
    },
    {
      title: 'Seamless Integration',
      description:
        'Integrate our platform with your existing CRM, marketing automation, and other business systems.',
      icon: MessageSquare,
    },
  ]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-gray-50 py-24">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Transform Your Business with AI-Powered Voice Calling
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Automate your customer interactions, generate leads, and improve
                customer satisfaction with our cutting-edge AI voice technology.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/dashboard">
                  <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/contact-sales">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
                  >
                    Contact Sales
                  </Button>
                </Link>
              </div>
            </div>
            <div>
              <img
                src="/hero-image.svg"
                alt="AI Voice Calling"
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <stat.icon className="h-4 w-4 text-gray-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-sm text-gray-500">{stat.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Key Features of AIVoiceCaller
            </h2>
            <p className="text-xl text-gray-600">
              Explore the powerful features that make our platform the best choice
              for AI-powered voice calling.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="h-full">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <feature.icon className="h-5 w-5 text-indigo-500" />
                    {feature.title}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent></CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">
              What Our Customers Are Saying
            </h2>
            <p className="text-xl text-gray-600">
              Read why businesses across Pakistan and beyond are choosing
              AIVoiceCaller to transform their communication.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src="/company-logo-1.svg"
                        alt="Company Logo"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <h3 className="text-lg font-semibold">Acme Corp</h3>
                        <p className="text-sm text-gray-500">Technology</p>
                      </div>
                    </div>
                    <Badge variant="secondary">4.5/5</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                "AIVoiceCaller has revolutionized our customer engagement. The AI
                agents are incredibly effective and have significantly improved our
                customer satisfaction."
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src="/company-logo-2.svg"
                        alt="Company Logo"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <h3 className="text-lg font-semibold">Beta Inc</h3>
                        <p className="text-sm text-gray-500">Healthcare</p>
                      </div>
                    </div>
                    <Badge variant="secondary">4.7/5</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                "We've seen a dramatic reduction in appointment no-shows since
                implementing AIVoiceCaller. The automated reminders are a game-changer
                for our practice."
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <img
                        src="/company-logo-3.svg"
                        alt="Company Logo"
                        className="w-8 h-8 rounded-full"
                      />
                      <div>
                        <h3 className="text-lg font-semibold">Gamma Ltd</h3>
                        <p className="text-sm text-gray-500">E-commerce</p>
                      </div>
                    </div>
                    <Badge variant="secondary">4.9/5</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                "Our sales team is now able to focus on high-value leads, thanks to
                AIVoiceCaller's intelligent lead qualification. It's been a huge boost
                to our bottom line."
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-indigo-50 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Ready to Transform Your Business?
          </h2>
          <p className="text-xl text-gray-700 mb-8">
            Start your free trial today and experience the power of AI-powered
            voice calling.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                Start Free Trial
              </Button>
            </Link>
            <Link to="/contact-sales">
              <Button
                size="lg"
                variant="outline"
                className="border-indigo-600 text-indigo-600 hover:bg-indigo-50"
              >
                Contact Sales
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
