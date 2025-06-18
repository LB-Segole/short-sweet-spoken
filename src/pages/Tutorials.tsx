
import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';
import { Clock, User, Calendar } from 'lucide-react';

interface TutorialProps {
  title: string;
  description: string;
  image: string;
  duration: string;
  author: string;
  date: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  link: string;
}

const TutorialCard = ({ tutorial }: { tutorial: TutorialProps }) => {
  const levelColorClass = 
    tutorial.level === 'Beginner' ? 'bg-green-100 text-green-800' :
    tutorial.level === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md">
      <div className="h-48 overflow-hidden">
        <img 
          src={tutorial.image} 
          alt={tutorial.title} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${levelColorClass}`}>
            {tutorial.level}
          </span>
          <div className="flex items-center text-gray-500 text-sm">
            <Clock className="h-3 w-3 mr-1" />
            {tutorial.duration}
          </div>
        </div>
        
        <h3 className="text-xl font-bold mb-2">{tutorial.title}</h3>
        <p className="text-gray-600 mb-4 line-clamp-2">{tutorial.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">{tutorial.author}</p>
              <div className="flex items-center text-gray-500 text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {tutorial.date}
              </div>
            </div>
          </div>
          
          <Link 
            to={tutorial.link}
            className="text-indigo-600 font-medium hover:underline text-sm"
          >
            View Tutorial →
          </Link>
        </div>
      </div>
    </div>
  );
};

const Tutorials = () => {
  const tutorials: TutorialProps[] = [
    {
      title: "Getting Started with AIVoiceCaller",
      description: "Learn how to set up your account, create your first campaign, and make your first AI call.",
      image: "/placeholder.svg",
      duration: "15 min",
      author: "Sarah Johnson",
      date: "May 15, 2025",
      level: "Beginner",
      link: "/tutorials/getting-started"
    },
    {
      title: "Creating Effective Call Scripts",
      description: "Best practices for writing natural-sounding scripts that engage your audience and achieve your goals.",
      image: "/placeholder.svg",
      duration: "25 min",
      author: "Michael Chen",
      date: "May 10, 2025",
      level: "Beginner",
      link: "/tutorials/effective-scripts"
    },
    {
      title: "Advanced Voice Customization",
      description: "Learn how to fine-tune voice parameters for the perfect tone, pacing, and personality for your brand.",
      image: "/placeholder.svg",
      duration: "30 min",
      author: "Priya Sharma",
      date: "May 8, 2025",
      level: "Intermediate",
      link: "/tutorials/voice-customization"
    },
    {
      title: "Campaign Analytics Deep Dive",
      description: "Understand your campaign metrics, identify optimization opportunities, and measure ROI effectively.",
      image: "/placeholder.svg",
      duration: "40 min",
      author: "David Wilson",
      date: "May 5, 2025",
      level: "Intermediate",
      link: "/tutorials/analytics-deep-dive"
    },
    {
      title: "API Integration: Connecting AIVoiceCaller to Your CRM",
      description: "Step-by-step guide to integrating AIVoiceCaller with popular CRM platforms using our robust API.",
      image: "/placeholder.svg",
      duration: "45 min",
      author: "Jason Roberts",
      date: "April 28, 2025",
      level: "Advanced",
      link: "/tutorials/api-crm-integration"
    },
    {
      title: "Creating Dynamic Conversation Flows",
      description: "Build sophisticated branching conversation paths based on customer responses to maximize engagement.",
      image: "/placeholder.svg",
      duration: "50 min",
      author: "Lisa Thompson",
      date: "April 22, 2025",
      level: "Advanced",
      link: "/tutorials/dynamic-conversations"
    },
    {
      title: "Setting Up Call Transfer to Live Agents",
      description: "Learn how to configure seamless handoffs between AI and human agents for complex scenarios.",
      image: "/placeholder.svg",
      duration: "30 min",
      author: "Carlos Rodriguez",
      date: "April 18, 2025",
      level: "Intermediate",
      link: "/tutorials/call-transfer"
    },
    {
      title: "Voice AI for Customer Support",
      description: "How to automate common customer service requests while maintaining a high-quality experience.",
      image: "/placeholder.svg",
      duration: "35 min",
      author: "Emma Taylor",
      date: "April 15, 2025",
      level: "Intermediate",
      link: "/tutorials/customer-support"
    },
    {
      title: "Compliance Best Practices for Automated Calling",
      description: "Navigate regulatory requirements and industry best practices to ensure compliant calling campaigns.",
      image: "/placeholder.svg",
      duration: "40 min",
      author: "Robert Kim",
      date: "April 10, 2025",
      level: "Beginner",
      link: "/tutorials/compliance"
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-gray-50 py-12 flex-grow">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Tutorials</h1>
            <p className="text-xl text-gray-600">
              Learn how to make the most of the AIVoiceCaller platform with our comprehensive tutorials.
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-4 justify-center mb-8">
              <button className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium">
                All Tutorials
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Beginner
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Intermediate
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Advanced
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Campaign Setup
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Voice AI
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Integration
              </button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorials.map((tutorial, index) => (
                <TutorialCard key={index} tutorial={tutorial} />
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <button className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-indigo-50 transition-colors">
                Load More Tutorials
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Tutorials;
