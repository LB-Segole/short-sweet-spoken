
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileData {
  name: string;
  phone: string;
  country: string;
  address: string;
  organization: string;
}

const Settings = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    phone: '',
    country: '',
    address: '',
    organization: '',
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.user_metadata?.phone || '',
        country: user.user_metadata?.country || '',
        address: user.user_metadata?.address || '',
        organization: user.user_metadata?.organization || '',
      });
    }
  }, [user]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateProfile = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          name: profileData.name,
          phone: profileData.phone,
          country: profileData.country,
          address: profileData.address,
          organization: profileData.organization,
        }
      });

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your account settings and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={profileData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={profileData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                placeholder="Enter your country"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={profileData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
                placeholder="Enter your organization"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profileData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter your address"
              />
            </div>
          </div>

          <Button onClick={updateProfile} disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Profile'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input value={user?.email || ''} disabled />
            <p className="text-sm text-gray-500">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
