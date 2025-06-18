
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const BlogPost = () => {
  const { id } = useParams();

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" asChild className="mb-6">
        <Link to="/blog">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Link>
      </Button>
      
      <article className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Blog Post {id}</h1>
        <div className="text-gray-600 mb-8">
          Published on March 15, 2024 • 5 min read
        </div>
        
        <div className="prose max-w-none">
          <p className="lead">
            This is a sample blog post. In a real application, you would fetch the
            blog post content based on the ID from your CMS or database.
          </p>
          
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
            tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
            veniam, quis nostrud exercitation ullamco laboris.
          </p>
          
          <h2>Key Features</h2>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
            dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
            proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
          </p>
        </div>
      </article>
    </div>
  );
};

export default BlogPost;
