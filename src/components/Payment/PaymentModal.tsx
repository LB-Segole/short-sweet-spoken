
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Check, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState('basic');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'basic',
      name: 'Basic Plan',
      price: 49,
      period: 'month',
      features: [
        'Up to 500 calls per month',
        '2 AI Agents',
        'Basic analytics',
        'Email support',
        'Call recording'
      ]
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 99,
      period: 'month',
      features: [
        'Up to 2,000 calls per month',
        '10 AI Agents',
        'Advanced analytics',
        'Priority support',
        'Call recording & transcription',
        'Custom voice training'
      ],
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 199,
      period: 'month',
      features: [
        'Unlimited calls',
        'Unlimited AI Agents',
        'Custom integrations',
        '24/7 phone support',
        'Advanced security',
        'Dedicated account manager'
      ]
    }
  ];

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const plan = plans.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan not found');

      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId: plan.id,
          planName: plan.name,
          amount: plan.price * 100, // Convert to cents
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in new tab
        window.open(data.url, '_blank');
        toast.success('Redirecting to secure payment...');
        onClose();
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Choose Your Plan</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">Start Your Free 30-Day Trial</h3>
            <p className="text-gray-600">No credit card required. Cancel anytime during trial.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {plans.map((plan) => (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all ${
                  selectedPlan === plan.id
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : 'hover:shadow-md'
                } ${plan.popular ? 'border-blue-500' : ''}`}
                onClick={() => setSelectedPlan(plan.id)}
              >
                {plan.popular && (
                  <div className="bg-blue-500 text-white text-center py-2 text-sm font-medium">
                    Most Popular
                  </div>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div className="text-3xl font-bold">
                    ${plan.price}
                    <span className="text-lg font-normal text-gray-600">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={handlePayment}
              disabled={isProcessing}
              className="px-8 py-3 text-lg"
              size="lg"
            >
              {isProcessing ? 'Processing...' : 'Start Free Trial & Subscribe'}
            </Button>
            <p className="text-sm text-gray-500 mt-4">
              Secure payment powered by Stripe. Your trial starts immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
