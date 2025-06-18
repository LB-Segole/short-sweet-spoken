
import React from 'react';
import { Progress } from './progress';
import { Check, X } from 'lucide-react';

interface PasswordStrengthProps {
  password: string;
  onValidationChange: (isValid: boolean) => void;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ 
  password, 
  onValidationChange 
}) => {
  const requirements = [
    { test: (p: string) => p.length >= 8, label: 'At least 8 characters' },
    { test: (p: string) => /[A-Z]/.test(p), label: 'One uppercase letter' },
    { test: (p: string) => /[a-z]/.test(p), label: 'One lowercase letter' },
    { test: (p: string) => /\d/.test(p), label: 'One number' },
    { test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p), label: 'One special character' },
  ];

  const metRequirements = requirements.filter(req => req.test(password));
  const strength = (metRequirements.length / requirements.length) * 100;
  const isValid = metRequirements.length === requirements.length;

  React.useEffect(() => {
    onValidationChange(isValid);
  }, [isValid, onValidationChange]);

  const getStrengthColor = () => {
    if (strength < 40) return 'bg-red-500';
    if (strength < 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = () => {
    if (strength < 40) return 'Weak';
    if (strength < 80) return 'Medium';
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Password strength</span>
        <span className={`text-sm font-medium ${
          strength < 40 ? 'text-red-600' : 
          strength < 80 ? 'text-yellow-600' : 
          'text-green-600'
        }`}>
          {getStrengthLabel()}
        </span>
      </div>
      
      <Progress value={strength} className="h-2">
        <div className={`h-full transition-all ${getStrengthColor()}`} style={{ width: `${strength}%` }} />
      </Progress>
      
      <div className="space-y-1">
        {requirements.map((req, index) => {
          const isMet = req.test(password);
          return (
            <div key={index} className="flex items-center text-sm">
              {isMet ? (
                <Check className="h-4 w-4 text-green-500 mr-2" />
              ) : (
                <X className="h-4 w-4 text-gray-400 mr-2" />
              )}
              <span className={isMet ? 'text-green-600' : 'text-gray-500'}>
                {req.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
