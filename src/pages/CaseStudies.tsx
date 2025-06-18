
import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';
import { ArrowRight } from 'lucide-react';

interface CaseStudy {
  id: string;
  title: string;
  company: string;
  industry: string;
  challenge: string;
  solution: string;
  results: string[];
  testimonial?: {
    quote: string;
    author: string;
    position: string;
  };
  logo: string;
  image: string;
}

const CaseStudies = () => {
  const caseStudies: CaseStudy[] = [
    {
      id: 'technovate',
      title: 'How TechnoVate Increased Sales Conversions by 35%',
      company: 'TechnoVate Solutions',
      industry: 'SaaS',
      challenge: 'TechnoVate struggled with scaling their sales outreach while maintaining quality conversations and personalized follow-ups.',
      solution: 'Implemented AIVoiceCaller for initial prospect qualification and automated follow-ups, allowing sales reps to focus on high-value conversations.',
      results: [
        '35% increase in sales conversion rate',
        '68% reduction in cost per qualified lead',
        '3x more prospects contacted with the same team size',
        '89% positive customer feedback on AI call quality'
      ],
      testimonial: {
        quote: 'AIVoiceCaller transformed our sales process. We\'re reaching more prospects with better conversations, and our sales team can focus on what they do best - closing deals.',
        author: 'Sarah Williams',
        position: 'VP of Sales, TechnoVate Solutions'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    },
    {
      id: 'medicalplus',
      title: 'MedicalPlus Reduced Appointment No-Shows by 62%',
      company: 'MedicalPlus Healthcare',
      industry: 'Healthcare',
      challenge: 'MedicalPlus faced a high rate of appointment no-shows, resulting in lost revenue and inefficient scheduling.',
      solution: 'Deployed AIVoiceCaller for automated appointment reminders with interactive confirmation and rescheduling options.',
      results: [
        '62% reduction in appointment no-shows',
        '41% of potential cancellations successfully rescheduled',
        '22% increase in overall appointment efficiency',
        'Annual savings of $320,000 in operational costs'
      ],
      testimonial: {
        quote: 'The AI calls sound remarkably natural, and patients appreciate the timely reminders. Our staff can now focus on in-person care instead of making reminder calls.',
        author: 'Dr. James Chen',
        position: 'Medical Director, MedicalPlus Healthcare'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    },
    {
      id: 'financepro',
      title: 'FinancePro Enhanced Customer Satisfaction While Reducing Support Costs',
      company: 'FinancePro Services',
      industry: 'Financial Services',
      challenge: 'FinancePro needed to improve customer support efficiency while maintaining high service standards for their financial products.',
      solution: 'Integrated AIVoiceCaller for first-tier support inquiries with intelligent routing to specialized human agents when needed.',
      results: [
        '45% reduction in customer wait times',
        '73% of routine inquiries successfully handled by AI',
        'Customer satisfaction ratings increased from 3.6 to 4.5/5',
        '28% annual reduction in support costs'
      ],
      testimonial: {
        quote: 'Our customers get immediate answers to their questions, and our support specialists now handle only the complex issues that truly require their expertise.',
        author: 'Maria Rodriguez',
        position: 'Customer Experience Director, FinancePro Services'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    },
    {
      id: 'retailnext',
      title: 'RetailNext Revolutionized Customer Feedback Collection',
      company: 'RetailNext Stores',
      industry: 'Retail',
      challenge: 'RetailNext struggled to collect meaningful customer feedback at scale, resulting in low response rates to traditional surveys.',
      solution: 'Used AIVoiceCaller to conduct conversational post-purchase satisfaction surveys with dynamic question paths.',
      results: [
        'Survey completion rates increased from 12% to 58%',
        '3.2x more actionable feedback collected per month',
        'Identified and resolved two major customer pain points',
        'Increased repeat purchase rate by 14% after implementing feedback'
      ],
      testimonial: {
        quote: 'The quality and quantity of feedback we\'re getting has transformed our ability to improve the customer experience. People actually enjoy the conversation with the AI.',
        author: 'Thomas Lee',
        position: 'Head of Customer Insights, RetailNext Stores'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    },
    {
      id: 'traveluxe',
      title: 'TraveLuxe Streamlined Booking Confirmations and Increased Upsells',
      company: 'TraveLuxe Vacations',
      industry: 'Travel & Hospitality',
      challenge: 'TraveLuxe needed to enhance their booking confirmation process and identify upsell opportunities without increasing staff workload.',
      solution: 'Deployed AIVoiceCaller for booking confirmations with personalized travel enhancement suggestions based on customer profiles.',
      results: [
        '100% of bookings received confirmation calls (up from 60%)',
        '26% increase in travel package upgrades',
        '31% increase in add-on services purchased',
        'Enhanced customer experience with personalized suggestions'
      ],
      testimonial: {
        quote: 'Our customers love getting personalized suggestions that actually make their trips better, and our revenue per booking has increased significantly.',
        author: 'Elena Diaz',
        position: 'CEO, TraveLuxe Vacations'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    },
    {
      id: 'edumaster',
      title: 'EduMaster Improved Student Engagement and Completion Rates',
      company: 'EduMaster Online Learning',
      industry: 'Education',
      challenge: 'EduMaster struggled with student engagement and course completion rates in their online learning platform.',
      solution: 'Implemented AIVoiceCaller for personalized check-ins, progress monitoring, and timely intervention for at-risk students.',
      results: [
        '27% increase in course completion rates',
        '42% improvement in assignment submission timeliness',
        'Student satisfaction scores improved by 18%',
        'Reduced administrative workload by 35% for student success team'
      ],
      testimonial: {
        quote: 'The regular check-ins from the AI voice assistant have made our students feel supported and accountable. They\'re no longer just names in a database.',
        author: 'Professor Robert Johnson',
        position: 'Academic Director, EduMaster Online Learning'
      },
      logo: '/placeholder.svg',
      image: '/placeholder.svg'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Case Studies</h1>
            <p className="text-xl text-gray-600">
              See how organizations are transforming their operations with AIVoiceCaller.
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-4 justify-center mb-12">
              <button className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-medium">
                All Industries
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                SaaS
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Healthcare
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Financial Services
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Retail
              </button>
              <button className="px-4 py-2 rounded-full bg-white text-gray-700 hover:bg-gray-100 text-sm font-medium">
                Education
              </button>
            </div>

            {/* Featured Case Study */}
            <div className="bg-white rounded-lg overflow-hidden shadow-lg mb-12">
              <div className="grid md:grid-cols-2">
                <div className="p-8 md:p-12">
                  <div className="mb-6">
                    <div className="h-12 w-32 bg-gray-200 rounded mb-6"></div>
                    <h2 className="text-3xl font-bold mb-4">How TechnoVate Increased Sales Conversions by 35%</h2>
                    <p className="text-gray-600 mb-6">
                      TechnoVate Solutions transformed their sales process with AIVoiceCaller, allowing their team to reach more prospects while maintaining personalized conversations.
                    </p>
                    <div className="flex flex-col gap-3 mb-8">
                      {caseStudies[0].results.map((result, index) => (
                        <div key={index} className="flex items-start">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center mr-3 mt-0.5">✓</span>
                          <span>{result}</span>
                        </div>
                      ))}
                    </div>
                    <Link 
                      to={`/case-studies/${caseStudies[0].id}`} 
                      className="inline-flex items-center text-indigo-600 font-medium hover:underline"
                    >
                      Read full case study <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </div>
                </div>
                <div className="bg-gray-200">
                  <img 
                    src={caseStudies[0].image} 
                    alt={caseStudies[0].title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            
            {/* Other Case Studies Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {caseStudies.slice(1).map((study) => (
                <div key={study.id} className="bg-white rounded-lg overflow-hidden shadow-md">
                  <div className="h-48 bg-gray-200">
                    <img 
                      src={study.image} 
                      alt={study.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <div className="h-10 w-20 bg-gray-100 rounded mb-4"></div>
                    <h3 className="text-xl font-bold mb-2">{study.title}</h3>
                    <p className="text-gray-700 mb-4">
                      {study.challenge.length > 120 ? study.challenge.substring(0, 120) + '...' : study.challenge}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{study.industry}</span>
                      <Link 
                        to={`/case-studies/${study.id}`} 
                        className="text-indigo-600 font-medium hover:underline text-sm inline-flex items-center"
                      >
                        Read more <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
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

export default CaseStudies;
