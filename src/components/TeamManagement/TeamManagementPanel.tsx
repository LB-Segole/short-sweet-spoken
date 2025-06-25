
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, UserPlus, Settings, Crown, Shield, User, Eye, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamMember {
  id: string;
  user_id: string;
  email?: string;
  name?: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_at: string;
  joined_at?: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  members: TeamMember[];
}

interface TeamManagementPanelProps {
  team: Team;
  currentUserId: string;
  onUpdateTeam: (team: Partial<Team>) => void;
  onInviteMember: (email: string, role: string) => void;
  onRemoveMember: (memberId: string) => void;
  onUpdateMemberRole: (memberId: string, role: string) => void;
}

export const TeamManagementPanel: React.FC<TeamManagementPanelProps> = ({
  team,
  currentUserId,
  onUpdateTeam,
  onInviteMember,
  onRemoveMember,
  onUpdateMemberRole
}) => {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<string>('member');
  const [teamName, setTeamName] = useState(team.name);
  const [teamDescription, setTeamDescription] = useState(team.description || '');
  const { toast } = useToast();

  const currentUserRole = team.members.find(m => m.user_id === currentUserId)?.role;
  const canManageTeam = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canInvite = canManageTeam;

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Email is required.",
        variant: "destructive"
      });
      return;
    }

    onInviteMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setInviteRole('member');
    setShowInviteDialog(false);
    
    toast({
      title: "Invitation Sent",
      description: `Invitation sent to ${inviteEmail}`
    });
  };

  const handleUpdateTeam = () => {
    onUpdateTeam({
      name: teamName,
      description: teamDescription
    });
    
    toast({
      title: "Team Updated",
      description: "Team information has been updated."
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />;
      case 'admin': return <Shield className="w-4 h-4" />;
      case 'member': return <User className="w-4 h-4" />;
      case 'viewer': return <Eye className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-yellow-100 text-yellow-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Team Management
            </CardTitle>
            <Badge className="bg-purple-100 text-purple-800">
              {team.subscription_tier.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Team Members ({team.members.length})</CardTitle>
                {canInvite && (
                  <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <UserPlus className="w-4 h-4 mr-2" />
                        Invite Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite Team Member</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="email">Email Address</Label>
                          <Input
                            id="email"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            placeholder="colleague@company.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Select value={inviteRole} onValueChange={setInviteRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer - Read only access</SelectItem>
                              <SelectItem value="member">Member - Can create and edit</SelectItem>
                              <SelectItem value="admin">Admin - Full management access</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleInvite}>Send Invitation</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {team.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          <AvatarInitials name={member.name || member.email || 'U'} />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name || 'Unnamed User'}</div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {member.email || 'No email'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={`flex items-center gap-1 ${getRoleColor(member.role)}`}>
                        {getRoleIcon(member.role)}
                        {member.role}
                      </Badge>
                      
                      {canManageTeam && member.role !== 'owner' && member.user_id !== currentUserId && (
                        <div className="flex space-x-1">
                          <Select
                            value={member.role}
                            onValueChange={(role) => onUpdateMemberRole(member.id, role)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer</SelectItem>
                              <SelectItem value="member">Member</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Team Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  disabled={!canManageTeam}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="teamDescription">Description</Label>
                <Input
                  id="teamDescription"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Describe your team's purpose"
                  disabled={!canManageTeam}
                />
              </div>
              
              {canManageTeam && (
                <Button onClick={handleUpdateTeam}>Update Team</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Billing & Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Current Plan</div>
                    <div className="text-sm text-gray-500">
                      {team.subscription_tier === 'free' && 'Free tier with basic features'}
                      {team.subscription_tier === 'pro' && 'Pro tier with advanced features'}
                      {team.subscription_tier === 'enterprise' && 'Enterprise tier with full features'}
                    </div>
                  </div>
                  <Badge className={getRoleColor(team.subscription_tier)}>
                    {team.subscription_tier.toUpperCase()}
                  </Badge>
                </div>
                
                {currentUserRole === 'owner' && (
                  <Button variant="outline">Manage Subscription</Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
