import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const testimonials = [
  {
    name: 'Sarah Johnson',
    title: 'CEO at TechStart',
    image: '/testimonial1.jpg',
    quote: 'AIVoiceCaller has revolutionized our sales outreach. We\'ve seen a 40% increase in successful connections and our team can focus on closing deals instead of making initial calls.',
  },
  {
    name: 'Michael Chen',
    title: 'Director of Marketing, GrowthMasters',
    image: '/testimonial2.jpg',
    quote: 'The natural-sounding AI voices are incredible. Our customers often can\'t tell they\'re speaking with an AI until we tell them. The ROI has been phenomenal.',
  },
  {
    name: 'Emily Rodriguez',
    title: 'Head of Customer Success, ServePro',
    image: '/testimonial3.jpg',
    quote: 'We use AIVoiceCaller for appointment confirmations and follow-ups. Our no-show rate has dropped by 35% since implementing the system.',
  },
];

const Testimonials = () => {
  return (
    <div className="bg-gray-50 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Businesses of all sizes are transforming their operations with AIVoiceCaller
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-full overflow-hidden mr-4">
                  <img 
                    src={testimonial.image || `https://via.placeholder.com/100?text=${testimonial.name[0]}`} 
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://via.placeholder.com/100?text=${testimonial.name[0]}`;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold">{testimonial.name}</h3>
                  <p className="text-gray-600 text-sm">{testimonial.title}</p>
                </div>
              </div>
              <p className="text-gray-700 italic">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Testimonials;
