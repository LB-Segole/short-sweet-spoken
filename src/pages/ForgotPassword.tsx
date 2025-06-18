
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { validateEmail } from '@/utils/validation';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const { resetPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      await resetPassword(email);
      setEmailSent(true);
      toast.success('Password reset email sent successfully');
    } catch (error) {
      toast.error('Failed to send reset email. Please try again.');
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link to="/" className="text-3xl font-bold text-indigo-600">First Choice LLC</Link>
            <p className="mt-2 text-gray-600">Check your email</p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Email Sent</CardTitle>
              <CardDescription>
                We've sent a password reset link to {email}. 
                Please check your email and follow the instructions to reset your password.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setEmailSent(false)}
                  className="mr-2"
                >
                  Try Again
                </Button>
                <Link to="/login">
                  <Button variant="ghost">Back to Login</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-3xl font-bold text-indigo-600">First Choice LLC</Link>
          <p className="mt-2 text-gray-600">Reset your password</p>
        </div>
        
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address and we'll send you a link to reset your password
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="your@email.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
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

export default ForgotPassword;
