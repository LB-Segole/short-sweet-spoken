
import React, { useState } from 'react';
import { TeamManagementPanel } from '@/components/TeamManagement/TeamManagementPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';

export const TeamManagement: React.FC = () => {
  const [selectedTeam] = useState<string | null>('team-1');

  // Mock data - replace with actual data fetching
  const currentUserId = 'current-user-id';
  
  const mockTeam = {
    id: 'team-1',
    name: 'Acme Corp AI Team',
    description: 'Our main AI development team',
    owner_id: 'current-user-id',
    subscription_tier: 'pro' as const,
    members: [
      {
        id: 'member-1',
        user_id: 'current-user-id',
        email: 'owner@acme.com',
        name: 'John Doe',
        role: 'owner' as const,
        invited_at: '2024-01-01T00:00:00Z',
        joined_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'member-2',
        user_id: 'user-2',
        email: 'admin@acme.com',
        name: 'Jane Smith',
        role: 'admin' as const,
        invited_at: '2024-01-02T00:00:00Z',
        joined_at: '2024-01-02T00:00:00Z'
      },
      {
        id: 'member-3',
        user_id: 'user-3',
        email: 'developer@acme.com',
        name: 'Bob Johnson',
        role: 'member' as const,
        invited_at: '2024-01-03T00:00:00Z',
        joined_at: '2024-01-03T00:00:00Z'
      }
    ]
  };

  const handleUpdateTeam = (updates: any) => {
    console.log('Updating team:', updates);
  };

  const handleInviteMember = (email: string, role: string) => {
    console.log('Inviting member:', { email, role });
  };

  const handleRemoveMember = (memberId: string) => {
    console.log('Removing member:', memberId);
  };

  const handleUpdateMemberRole = (memberId: string, role: string) => {
    console.log('Updating member role:', { memberId, role });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-gray-600">Manage your team members and permissions</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      {selectedTeam ? (
        <TeamManagementPanel
          team={mockTeam}
          currentUserId={currentUserId}
          onUpdateTeam={handleUpdateTeam}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onUpdateMemberRole={handleUpdateMemberRole}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              No Team Selected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Create or select a team to manage members and settings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
