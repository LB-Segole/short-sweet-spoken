
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { X, MessageCircle, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactSupportModal: React.FC<ContactSupportModalProps> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    urgency: 'normal'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Submit support ticket to Supabase
      const { error } = await supabase.functions.invoke('support-ticket', {
        body: formData
      });

      if (error) throw error;

      toast.success('Support ticket submitted successfully! We\'ll get back to you within 24 hours.');
      onClose();
      setFormData({ name: '', email: '', subject: '', message: '', urgency: 'normal' });
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      toast.error('Failed to submit support ticket. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Contact Support</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Live Chat</p>
                <p className="text-xs text-gray-600">Response within minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Mail className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Email Support</p>
                <p className="text-xs text-gray-600">support@firstchoicellc.com</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Phone className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-sm">Phone Support</p>
                <p className="text-xs text-gray-600">+1 (203) 793-6539</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  placeholder="Your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                  placeholder="your.email@example.com"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                required
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <Label htmlFor="urgency">Urgency Level</Label>
              <select
                id="urgency"
                value={formData.urgency}
                onChange={(e) => handleInputChange('urgency', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="low">Low - General inquiry</option>
                <option value="normal">Normal - Standard support</option>
                <option value="high">High - Business impacting</option>
                <option value="urgent">Urgent - System down</option>
              </select>
            </div>

            <div>
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                required
                placeholder="Please describe your issue in detail..."
                className="min-h-[120px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.email || !formData.subject || !formData.message}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactSupportModal;
