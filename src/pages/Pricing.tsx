
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const Pricing = () => {
  const plans = [
    {
      name: "Starter",
      price: "$29",
      period: "per month",
      description: "Perfect for small businesses getting started with voice AI",
      features: [
        "Up to 500 minutes/month",
        "1 AI assistant",
        "Basic analytics",
        "Email support",
        "Standard voice quality"
      ],
      popular: false,
      cta: "Start Free Trial"
    },
    {
      name: "Professional",
      price: "$99",
      period: "per month",
      description: "Ideal for growing businesses with higher volume needs",
      features: [
        "Up to 2,500 minutes/month",
        "5 AI assistants",
        "Advanced analytics",
        "Priority support",
        "Premium voice quality",
        "Custom integrations"
      ],
      popular: true,
      cta: "Start Free Trial"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations with custom requirements",
      features: [
        "Unlimited minutes",
        "Unlimited AI assistants",
        "Real-time analytics",
        "24/7 dedicated support",
        "Ultra-premium voices",
        "Custom integrations",
        "On-premise deployment",
        "SLA guarantee"
      ],
      popular: false,
      cta: "Contact Sales"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Choose the perfect plan for your business. All plans include our core features
          with no hidden fees.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {plans.map((plan, index) => (
          <Card key={index} className={`relative ${plan.popular ? 'border-blue-500 shadow-lg scale-105' : ''}`}>
            {plan.popular && (
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                <Star className="w-3 h-3 mr-1" />
                Most Popular
              </Badge>
            )}
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-600 ml-1">{plan.period}</span>
              </div>
              <p className="text-gray-600 mt-2">{plan.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {plan.features.map((feature, featureIndex) => (
                  <li key={featureIndex} className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link to={plan.cta === "Contact Sales" ? "/contact-sales" : "/register"}>
                  {plan.cta}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center mt-12">
        <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="text-left">
            <h3 className="font-semibold mb-2">Can I change plans at any time?</h3>
            <p className="text-gray-600">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
          </div>
          <div className="text-left">
            <h3 className="font-semibold mb-2">What happens if I exceed my monthly minutes?</h3>
            <p className="text-gray-600">We'll notify you when you approach your limit. You can either upgrade your plan or purchase additional minutes.</p>
          </div>
          <div className="text-left">
            <h3 className="font-semibold mb-2">Is there a free trial?</h3>
            <p className="text-gray-600">Yes! All plans come with a 14-day free trial. No credit card required to get started.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
