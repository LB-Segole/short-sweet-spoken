
const ApiDocumentation = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">API Documentation</h1>
      <div className="prose max-w-none">
        <p className="text-lg mb-6">
          Complete API reference for integrating with our Voice AI platform.
        </p>
        
        <h2 className="text-2xl font-semibold mb-4">Getting Started</h2>
        <p className="mb-4">
          To get started with our API, you'll need to obtain an API key from your dashboard.
        </p>
        
        <h3 className="text-xl font-semibold mb-3">Authentication</h3>
        <p className="mb-4">
          All API requests require authentication using your API key in the Authorization header.
        </p>
        
        <h3 className="text-xl font-semibold mb-3">Base URL</h3>
        <code className="bg-gray-100 px-2 py-1 rounded">
          https://api.voiceai.com/v1
        </code>
        
        <h2 className="text-2xl font-semibold mt-8 mb-4">Endpoints</h2>
        <p className="mb-4">
          Documentation for all available API endpoints will be provided here.
        </p>
      </div>
    </div>
  );
};

export default ApiDocumentation;
