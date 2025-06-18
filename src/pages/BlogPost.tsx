
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/Landing/Navbar';
import Footer from '@/components/Landing/Footer';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const blogPosts: { [key: string]: any } = {
    'future-ai-voice-customer-service': {
      title: 'The Future of AI Voice Technology in Customer Service',
      date: 'May 15, 2025',
      author: 'Dr. Zara Ahmed',
      category: 'Industry Trends',
      readTime: '8 min read',
      image: '/blog-future-ai.jpg',
      content: `
        <p>The landscape of customer service is rapidly evolving, and AI voice technology stands at the forefront of this transformation. As businesses across Pakistan and globally seek to enhance customer experiences while reducing operational costs, AI voice agents are proving to be game-changers.</p>
        
        <h2>The Current State of AI Voice Technology</h2>
        <p>Modern AI voice systems have moved far beyond the robotic, menu-driven interactions of the past. Today's AI agents can understand context, respond naturally, and even detect emotional cues in conversations. This evolution has made them particularly valuable for businesses in emerging markets like Pakistan, where multilingual support and cultural sensitivity are crucial.</p>
        
        <h2>Key Benefits for Pakistani Businesses</h2>
        <ul>
          <li><strong>24/7 Availability:</strong> AI agents work around the clock, ensuring customers can get support regardless of time zones or business hours.</li>
          <li><strong>Multilingual Support:</strong> With support for Urdu, English, Punjabi, and other regional languages, AI can serve Pakistan's diverse customer base.</li>
          <li><strong>Cost Efficiency:</strong> Reduce staffing costs while maintaining high-quality customer interactions.</li>
          <li><strong>Scalability:</strong> Handle thousands of calls simultaneously without compromising quality.</li>
        </ul>
        
        <h2>Real-World Applications</h2>
        <p>Pakistani businesses are already leveraging AI voice technology in innovative ways:</p>
        <ul>
          <li>Banking sector using AI for account inquiries and fraud prevention</li>
          <li>E-commerce companies automating order status and returns</li>
          <li>Healthcare providers managing appointment scheduling and reminders</li>
          <li>Educational institutions handling student inquiries and admissions</li>
        </ul>
        
        <h2>The Road Ahead</h2>
        <p>As AI technology continues to advance, we can expect even more sophisticated voice interactions. Future developments will likely include better emotion recognition, more nuanced conversation handling, and seamless integration with business systems.</p>
        
        <p>For businesses considering AI voice technology, the message is clear: the future is now, and early adopters will have a significant competitive advantage.</p>
      `
    },
    'effective-scripts-ai-voice-agents': {
      title: 'How to Write Effective Scripts for AI Voice Agents',
      date: 'May 8, 2025',
      author: 'Hassan Ali',
      category: 'Best Practices',
      readTime: '6 min read',
      image: '/blog-scripts.jpg',
      content: `
        <p>Creating effective scripts for AI voice agents is both an art and a science. The right script can make the difference between a successful customer interaction and a frustrated hang-up. Here's your comprehensive guide to writing scripts that work.</p>
        
        <h2>Understanding Your Audience</h2>
        <p>Before writing a single word, understand who your AI will be talking to. In Pakistan's diverse market, this means considering:</p>
        <ul>
          <li>Language preferences (Urdu, English, or regional languages)</li>
          <li>Cultural context and communication styles</li>
          <li>Technical literacy levels</li>
          <li>Common pain points and expectations</li>
        </ul>
        
        <h2>Script Structure Best Practices</h2>
        <h3>1. Start with a Clear Introduction</h3>
        <p>"Hello, this is Sarah from AIVoiceCaller. I'm calling to help you with your recent inquiry. Do you have a few minutes to chat?"</p>
        
        <h3>2. Use Conversational Language</h3>
        <p>Avoid corporate jargon and speak like a human would. Instead of "We would like to facilitate your understanding of our service offerings," say "I'd love to tell you about how we can help your business."</p>
        
        <h3>3. Build in Flexibility</h3>
        <p>Create branches for different responses. Your AI should be prepared for "yes," "no," "maybe," and unexpected answers.</p>
        
        <h2>Cultural Considerations for Pakistani Market</h2>
        <ul>
          <li>Use respectful titles and greetings appropriate to local customs</li>
          <li>Allow for longer relationship-building conversations</li>
          <li>Include options for family decision-making processes</li>
          <li>Respect religious considerations and timing</li>
        </ul>
        
        <h2>Testing and Optimization</h2>
        <p>The best scripts are living documents. Continuously test and refine based on:</p>
        <ul>
          <li>Conversation completion rates</li>
          <li>Customer satisfaction scores</li>
          <li>Common drop-off points</li>
          <li>Feedback from human agents</li>
        </ul>
        
        <p>Remember: A great script feels natural, provides value, and guides the conversation toward your business goals while respecting the customer's time and intelligence.</p>
      `
    }
  };

  const post = slug ? blogPosts[slug] : null;

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Blog Post Not Found</h1>
          <Link to="/blog" className="text-indigo-600 hover:underline">← Back to Blog</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Back to blog */}
          <Link to="/blog" className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-8">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Blog
          </Link>
          
          {/* Article header */}
          <article className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="h-64 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            
            <div className="p-8">
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-4">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  {post.date}
                </div>
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  {post.author}
                </div>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  {post.category}
                </div>
                <span>{post.readTime}</span>
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold mb-6">{post.title}</h1>
              
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
              />
              
              {/* Call to action */}
              <div className="mt-12 p-6 bg-indigo-50 rounded-lg">
                <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
                <p className="text-gray-600 mb-4">
                  Try AIVoiceCaller today and see how AI can transform your business communications.
                </p>
                <Link to="/dashboard">
                  <Button className="bg-indigo-600 hover:bg-indigo-700">
                    Start Free Trial
                  </Button>
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default BlogPost;
