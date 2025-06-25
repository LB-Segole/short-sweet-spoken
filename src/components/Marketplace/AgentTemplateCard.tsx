
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AvatarInitials } from '@/components/ui/avatar-initials';
import { Star, Download, Eye, Heart } from 'lucide-react';

interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  created_by: string;
  creator_name?: string;
  is_public: boolean;
  downloads_count: number;
  rating_average: number;
  rating_count: number;
  version: string;
  created_at: string;
}

interface AgentTemplateCardProps {
  template: AgentTemplate;
  onInstall: (template: AgentTemplate) => void;
  onPreview: (template: AgentTemplate) => void;
  onFavorite?: (template: AgentTemplate) => void;
  isInstalled?: boolean;
  isFavorited?: boolean;
}

export const AgentTemplateCard: React.FC<AgentTemplateCardProps> = ({
  template,
  onInstall,
  onPreview,
  onFavorite,
  isInstalled = false,
  isFavorited = false
}) => {
  const getCategoryColor = (category: string) => {
    const colors = {
      'Customer Service': 'bg-blue-100 text-blue-800',
      'Sales': 'bg-green-100 text-green-800',
      'Support': 'bg-purple-100 text-purple-800',
      'Healthcare': 'bg-red-100 text-red-800',
      'Education': 'bg-yellow-100 text-yellow-800',
      'Finance': 'bg-indigo-100 text-indigo-800',
      'General': 'bg-gray-100 text-gray-800'
    };
    return colors[category as keyof typeof colors] || colors['General'];
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">{template.name}</h3>
            <p className="text-sm text-gray-600 line-clamp-2 mb-3">
              {template.description}
            </p>
            
            <div className="flex items-center gap-2 mb-3">
              <Badge className={getCategoryColor(template.category)}>
                {template.category}
              </Badge>
              <Badge variant="outline">v{template.version}</Badge>
            </div>
          </div>
          
          {onFavorite && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onFavorite(template)}
              className={isFavorited ? 'text-red-500' : 'text-gray-400'}
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-current' : ''}`} />
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Creator Info */}
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarFallback>
              <AvatarInitials name={template.creator_name || 'User'} />
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-gray-600">
            by {template.creator_name || 'Anonymous'}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{template.rating_average.toFixed(1)}</span>
              <span>({template.rating_count})</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span>{template.downloads_count.toLocaleString()}</span>
            </div>
          </div>
          
          <span>{new Date(template.created_at).toLocaleDateString()}</span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {template.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{template.tags.length - 3} more
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(template)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          
          <Button
            onClick={() => onInstall(template)}
            disabled={isInstalled}
            size="sm"
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            {isInstalled ? 'Installed' : 'Install'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
