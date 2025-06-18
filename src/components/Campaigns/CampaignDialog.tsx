import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Phone, TestTube, Loader2 } from 'lucide-react';
import { callService } from '@/services/callService';
import { callVerificationService } from '@/services/callVerification.service';

export interface CampaignDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  campaign?: any;
  isLoading?: boolean;
}

export const CampaignDialog: React.FC<CampaignDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  campaign,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    description: campaign?.description || '',
    status: campaign?.status || 'active' as const,
    script_id: campaign?.script_id || ''
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [scripts, setScripts] = useState<any[]>([]);

  useEffect(() => {
    if (campaign) {
      setFormData({
        name: campaign.name || '',
        description: campaign.description || '',
        status: campaign.status || 'active',
        script_id: campaign.script_id || ''
      });
    }
  }, [campaign]);

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const response = await callService.getScripts()
        setScripts(response.data)
      } catch (error) {
        toast.error('Failed to fetch scripts')
      }
    }

    fetchScripts()
  }, []);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Campaign name is required';
    }
    
    if (formData.name.length > 100) {
      newErrors.name = 'Campaign name must be less than 100 characters';
    }
    
    if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    
    onSave(formData);
    onClose();
    resetForm();
  };

  const handleClose = () => {
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', status: 'active', script_id: '' });
    setErrors({});
  };

  const handleTestCall = async () => {
    if (!campaign?.id) {
      toast.error('Please save the campaign first before testing');
      return;
    }

    setIsTestingCall(true);
    
    try {
      // Use a test phone number for verification
      const testPhoneNumber = process.env.REACT_APP_TEST_PHONE_NUMBER || '+1234567890';
      
      toast.info('Initiating test call...');
      
      const callResponse = await callService.initiateCall({
        contactId: 'test-contact-' + Date.now(),
        campaignId: campaign.id,
        phoneNumber: testPhoneNumber,
        scriptId: formData.script_id
      });

      if (callResponse.success && callResponse.callId) {
        toast.success('Test call initiated successfully');
        
        // Start verification
        const verificationId = callVerificationService.startVerification(callResponse.callId);
        
        // Subscribe to verification updates
        callVerificationService.subscribe(verificationId, (session) => {
          console.log('Verification update:', session);
          
          const passedChecks = session.checks.filter(c => c.status === 'passed').length;
          const totalChecks = session.checks.length;
          
          if (session.status === 'completed') {
            toast.success(`Call verification completed: ${passedChecks}/${totalChecks} checks passed`);
            callVerificationService.cleanup(verificationId);
          } else if (session.status === 'failed') {
            const failedChecks = session.checks.filter(c => c.status === 'failed');
            toast.error(`Call verification failed: ${failedChecks.map(c => c.type).join(', ')}`);
            callVerificationService.cleanup(verificationId);
          } else {
            // Show progress
            toast.info(`Verification in progress: ${passedChecks}/${totalChecks} checks completed`);
          }
        });
        
      } else {
        toast.error(callResponse.error || 'Failed to initiate test call');
      }
    } catch (error) {
      console.error('Test call error:', error);
      toast.error('Failed to start test call');
    } finally {
      setIsTestingCall(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
          <DialogDescription>
            {campaign 
              ? 'Update your campaign details below.' 
              : 'Create a new calling campaign to reach your contacts.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Campaign Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter campaign name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <span className="text-sm text-red-500">{errors.name}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter campaign description"
              className={errors.description ? 'border-red-500' : ''}
              rows={3}
            />
            {errors.description && <span className="text-sm text-red-500">{errors.description}</span>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'paused' | 'completed' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="script">Call Script</Label>
            <Select
              value={formData.script_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, script_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a script (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No script</SelectItem>
                {scripts.map((script) => (
                  <SelectItem key={script.id} value={script.id}>
                    {script.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {campaign && (
            <div className="grid gap-2">
              <Label>Test Campaign</Label>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestCall}
                disabled={isTestingCall}
                className="w-full"
              >
                {isTestingCall ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing Call...
                  </>
                ) : (
                  <>
                    <TestTube className="h-4 w-4 mr-2" />
                    Test AI Agent Call
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                This will initiate a test call to verify AI agent functionality
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Phone className="h-4 w-4 mr-2" />
                {campaign ? 'Update Campaign' : 'Create Campaign'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
