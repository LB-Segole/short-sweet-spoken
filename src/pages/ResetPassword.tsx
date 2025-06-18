
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PasswordStrength } from '@/components/ui/password-strength';
import { validatePassword } from '@/utils/validation';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');

  useEffect(() => {
    if (!accessToken || !refreshToken) {
      toast.error('Invalid reset link. Please request a new password reset.');
      navigate('/forgot-password');
    }
  }, [accessToken, refreshToken, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validatePassword(password);
    if (!validation.isValid) {
      toast.error('Password does not meet requirements');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await updatePassword(password);
      toast.success('Password updated successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Failed to update password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-indigo-600">First Choice LLC</Link>
          <p className="mt-2 text-gray-600">Set your new password</p>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Reset Password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <PasswordStrength 
                  password={password} 
                  onValidationChange={setIsPasswordValid}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  type="password" 
                  placeholder="••••••••" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !isPasswordValid || password !== confirmPassword}
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </Button>
              
              <div className="text-center">
                <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
