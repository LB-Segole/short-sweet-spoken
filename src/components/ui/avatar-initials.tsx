
import React from 'react';

interface AvatarInitialsProps {
  name: string;
  className?: string;
}

export const AvatarInitials: React.FC<AvatarInitialsProps> = ({ name, className = "" }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <span className={`text-sm font-medium ${className}`}>
      {getInitials(name)}
    </span>
  );
};
