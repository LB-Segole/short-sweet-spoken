
import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';

const BlogPost = ({ title, date, excerpt, image, slug }: { 
  title: string, 
  date: string, 
  excerpt: string, 
  image: string,
  slug: string 
}) => (
  <div className="mb-12">
    <div className="relative h-60 mb-4 overflow-hidden rounded-lg">
      <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
    </div>
    <div>
      <p className="text-indigo-600 text-sm font-medium mb-1">{date}</p>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      <p className="text-gray-600 mb-4">{excerpt}</p>
      <Link to={`/blog/${slug}`} className="text-indigo-600 font-medium hover:underline">
        Read more →
      </Link>
    </div>
  </div>
);

const Blog = () => {
  const blogPosts = [
    {
      id: '1',
      title: 'The Future of AI Voice Technology in Customer Service',
      date: 'May 15, 2025',
      excerpt: 'Discover how AI voice agents are transforming customer service across Pakistan and globally, creating more personalized experiences while reducing operational costs.',
      image: '/placeholder.svg',
      slug: 'future-ai-voice-customer-service',
      category: 'Industry Trends'
    },
    {
      id: '2',
      title: 'How to Write Effective Scripts for AI Voice Agents',
      date: 'May 8, 2025',
      excerpt: 'Learn the best practices for creating scripts that sound natural and drive successful conversations, with special considerations for Pakistani markets.',
      image: '/placeholder.svg',
      slug: 'effective-scripts-ai-voice-agents',
      category: 'Best Practices'
    },
    {
      id: '3',
      title: 'Case Study: Lahore E-commerce Company Increases Sales by 45%',
      date: 'April 30, 2025',
      excerpt: 'See how a leading Pakistani e-commerce company transformed their customer outreach strategy with our AI voice technology.',
      image: '/placeholder.svg',
      slug: 'case-study-lahore-ecommerce',
      category: 'Case Studies'
    },
    {
      id: '4',
      title: 'Understanding Voice Recognition for Urdu and Regional Languages',
      date: 'April 22, 2025',
      excerpt: 'Explore the technical challenges and breakthroughs in voice recognition for Pakistani languages and how accuracy continues to improve.',
      image: '/placeholder.svg',
      slug: 'voice-recognition-urdu-languages',
      category: 'Technology'
    },
    {
      id: '5',
      title: '5 Ways AI Voice Calling Will Transform Pakistani Business in 2025',
      date: 'April 15, 2025',
      excerpt: 'Predictions and insights on how AI voice technology will change the way Pakistani businesses connect with their customers.',
      image: '/placeholder.svg',
      slug: 'transform-pakistani-business-2025',
      category: 'Industry Trends'
    },
    {
      id: '6',
      title: 'Compliance Guide: Legal Considerations for AI Calling in Pakistan',
      date: 'April 8, 2025',
      excerpt: 'Navigate the legal landscape of automated calling in Pakistan with our comprehensive compliance guide for local businesses.',
      image: '/placeholder.svg',
      slug: 'compliance-guide-pakistan',
      category: 'Compliance'
    }
  ];

  const categories = ['All', 'Industry Trends', 'Best Practices', 'Case Studies', 'Technology', 'Compliance'];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">AIVoiceCaller Blog</h1>
            <p className="text-xl text-gray-600">
              Insights, tutorials, and industry news on AI voice technology and automated calling systems for Pakistani businesses.
            </p>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    category === 'All' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogPosts.map((post) => (
                <BlogPost
                  key={post.id}
                  title={post.title}
                  date={post.date}
                  excerpt={post.excerpt}
                  image={post.image}
                  slug={post.slug}
                />
              ))}
            </div>
            
            <div className="text-center mt-12">
              <button className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-indigo-50 transition-colors">
                Load More Articles
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Blog;
