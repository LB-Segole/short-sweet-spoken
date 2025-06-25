
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTeamManagement } from '@/hooks/useTeamManagement';

interface TeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export const TeamDialog: React.FC<TeamDialogProps> = ({
  open,
  onOpenChange,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [billingEmail, setBillingEmail] = useState(initialData?.billing_email || '');
  const { createTeam, isLoading } = useTeamManagement();

  const handleSave = async () => {
    if (!name.trim()) return;

    const success = await createTeam({
      name,
      description,
      billing_email: billingEmail
    });

    if (success) {
      onOpenChange(false);
      setName('');
      setDescription('');
      setBillingEmail('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Team' : 'Create Team'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
            />
          </div>

          <div>
            <Label htmlFor="team-description">Description</Label>
            <Textarea
              id="team-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your team"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="billing-email">Billing Email</Label>
            <Input
              id="billing-email"
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="billing@company.com"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || !name.trim()}
            >
              {isLoading ? 'Creating...' : 'Create Team'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
