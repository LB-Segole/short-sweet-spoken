import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '@/components/Landing/Footer';
import Navbar from '@/components/Landing/Navbar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';

const CodeBlock = ({ code }: { code: string }) => (
  <div className="bg-gray-900 rounded-md p-4 overflow-x-auto">
    <pre className="text-gray-300 text-sm">
      <code>{code}</code>
    </pre>
  </div>
);

const ApiDocumentation = () => {
  const [activeMethod, setActiveMethod] = useState('authentication');

  const apiEndpoints = [
    {
      id: 'authentication',
      name: 'Authentication',
      description: 'Learn how to authenticate with the AIVoiceCaller API.',
      endpoint: 'POST /api/auth/token',
      request: `{
  "api_key": "your_api_key",
  "api_secret": "your_api_secret"
}`,
      response: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}`
    },
    {
      id: 'calls',
      name: 'Calls',
      description: 'Endpoints for managing phone calls.',
      endpoint: 'POST /api/calls',
      request: `{
  "to": "+15551234567",
  "from": "+15557654321",
  "script_id": "script_12345",
  "campaign_id": "campaign_67890",
  "callback_url": "https://your-callback-url.com/webhook"
}`,
      response: `{
  "call_id": "call_12345",
  "status": "queued",
  "created_at": "2025-05-21T14:30:00Z",
  "to": "+15551234567",
  "from": "+15557654321"
}`
    },
    {
      id: 'campaigns',
      name: 'Campaigns',
      description: 'Create and manage calling campaigns.',
      endpoint: 'POST /api/campaigns',
      request: `{
  "name": "Q2 Sales Outreach",
  "description": "Sales calls for Q2 promotions",
  "script_id": "script_12345",
  "contacts": ["contact_id1", "contact_id2"],
  "schedule": {
    "start_date": "2025-06-01",
    "end_date": "2025-06-30",
    "time_range": ["09:00", "17:00"],
    "time_zone": "America/New_York"
  }
}`,
      response: `{
  "campaign_id": "campaign_67890",
  "name": "Q2 Sales Outreach",
  "status": "draft",
  "created_at": "2025-05-21T14:30:00Z"
}`
    },
    {
      id: 'scripts',
      name: 'Scripts',
      description: 'Create and manage call scripts for your AI agents.',
      endpoint: 'POST /api/scripts',
      request: `{
  "name": "Sales Introduction",
  "content": {
    "greeting": "Hello, this is {agent_name} from {company_name}. How are you today?",
    "introduction": "I'm calling about our new {product_name} that I think would be perfect for your business.",
    "questions": [
      "Are you currently using a solution for {problem_area}?",
      "What challenges are you facing with your current solution?"
    ],
    "closing": "Thank you for your time. Would you like to schedule a follow-up call with one of our specialists?"
  },
  "parameters": {
    "agent_name": "Sarah",
    "company_name": "AIVoiceCaller",
    "product_name": "AI Voice Assistant",
    "problem_area": "customer service automation"
  }
}`,
      response: `{
  "script_id": "script_12345",
  "name": "Sales Introduction",
  "created_at": "2025-05-21T14:30:00Z",
  "version": 1
}`
    },
    {
      id: 'contacts',
      name: 'Contacts',
      description: 'Manage your contact list for campaigns.',
      endpoint: 'POST /api/contacts',
      request: `{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+15551234567",
  "email": "john.doe@example.com",
  "company": "Acme Inc.",
  "tags": ["prospect", "technology", "enterprise"],
  "custom_fields": {
    "industry": "Technology",
    "position": "CTO",
    "last_contact": "2025-04-15"
  }
}`,
      response: `{
  "contact_id": "contact_12345",
  "first_name": "John",
  "last_name": "Doe",
  "created_at": "2025-05-21T14:30:00Z"
}`
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Retrieve analytics data about your calls and campaigns.',
      endpoint: 'GET /api/analytics/campaigns/{campaign_id}',
      request: `// No request body needed`,
      response: `{
  "campaign_id": "campaign_67890",
  "name": "Q2 Sales Outreach",
  "metrics": {
    "total_calls": 145,
    "completed_calls": 132,
    "failed_calls": 13,
    "average_duration": 210.5,
    "conversion_rate": 24.2,
    "calls_per_day": [
      {"date": "2025-06-01", "count": 32},
      {"date": "2025-06-02", "count": 28},
      {"date": "2025-06-03", "count": 35}
    ]
  }
}`
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <div className="bg-gray-50 py-12 flex-grow">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">API Documentation</h1>
            <p className="text-xl text-gray-600 mb-8">
              Integrate AIVoiceCaller's powerful voice AI capabilities into your own applications.
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <Tabs defaultValue="rest" className="mb-12">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto">
                <TabsTrigger value="rest">REST API</TabsTrigger>
                <TabsTrigger value="sdk">SDKs</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>
              
              <TabsContent value="rest" className="mt-6">
                <div className="grid lg:grid-cols-12 gap-8">
                  {/* Sidebar menu */}
                  <div className="lg:col-span-3">
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="p-4 border-b">
                        <h3 className="font-bold text-gray-800">API Reference</h3>
                      </div>
                      <div className="p-2">
                        <ul>
                          {apiEndpoints.map(endpoint => (
                            <li key={endpoint.id}>
                              <button
                                onClick={() => setActiveMethod(endpoint.id)}
                                className={`w-full text-left px-4 py-2 rounded-md ${
                                  activeMethod === endpoint.id 
                                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`}
                              >
                                {endpoint.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content area */}
                  <div className="lg:col-span-9">
                    {apiEndpoints.map(endpoint => (
                      activeMethod === endpoint.id && (
                        <div key={endpoint.id} className="bg-white rounded-lg shadow-md p-6">
                          <h2 className="text-2xl font-bold mb-2">{endpoint.name}</h2>
                          <p className="text-gray-600 mb-6">{endpoint.description}</p>
                          
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Endpoint</h3>
                            <div className="bg-gray-100 text-gray-800 p-3 rounded-md font-mono">
                              {endpoint.endpoint}
                            </div>
                          </div>
                          
                          <div className="mb-6">
                            <h3 className="text-lg font-semibold mb-2">Request Body</h3>
                            <CodeBlock code={endpoint.request} />
                          </div>
                          
                          <div>
                            <h3 className="text-lg font-semibold mb-2">Response</h3>
                            <CodeBlock code={endpoint.response} />
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="sdk" className="mt-6">
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-4">AIVoiceCaller SDKs</h2>
                    <p className="text-gray-600 mb-6">Integrate our voice technology quickly with our official SDKs.</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">JavaScript / Node.js</h3>
                        <p className="text-gray-600 mb-4">Official JavaScript SDK for browser and Node.js applications.</p>
                        <CodeBlock code="npm install aivoicecaller-sdk" />
                        <a 
                          href="#" 
                          className="text-indigo-600 hover:underline mt-4 inline-block"
                        >
                          View Documentation →
                        </a>
                      </div>
                      
                      <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Python</h3>
                        <p className="text-gray-600 mb-4">Official Python SDK for server-side applications.</p>
                        <CodeBlock code="pip install aivoicecaller" />
                        <a 
                          href="#" 
                          className="text-indigo-600 hover:underline mt-4 inline-block"
                        >
                          View Documentation →
                        </a>
                      </div>
                      
                      <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">Java</h3>
                        <p className="text-gray-600 mb-4">Official Java SDK for enterprise applications.</p>
                        <CodeBlock 
                          code={`<dependency>\n  <groupId>com.aivoicecaller</groupId>\n  <artifactId>aivoicecaller-sdk</artifactId>\n  <version>1.0.0</version>\n</dependency>`} 
                        />
                        <a 
                          href="#" 
                          className="text-indigo-600 hover:underline mt-4 inline-block"
                        >
                          View Documentation →
                        </a>
                      </div>
                      
                      <div className="border rounded-lg p-6">
                        <h3 className="text-lg font-semibold mb-2">C#/.NET</h3>
                        <p className="text-gray-600 mb-4">Official .NET SDK for Windows and .NET Core applications.</p>
                        <CodeBlock code="Install-Package AIVoiceCaller.SDK" />
                        <a 
                          href="#" 
                          className="text-indigo-600 hover:underline mt-4 inline-block"
                        >
                          View Documentation →
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="webhooks" className="mt-6">
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <h2 className="text-2xl font-bold mb-4">Webhooks</h2>
                    <p className="text-gray-600 mb-6">
                      Set up webhooks to receive real-time updates from AIVoiceCaller about call events.
                    </p>
                    
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold mb-2">Available Webhook Events</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Event Type
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">call.initiated</td>
                              <td className="px-6 py-4">Triggered when a new call is initiated</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">call.answered</td>
                              <td className="px-6 py-4">Triggered when a call is answered</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">call.completed</td>
                              <td className="px-6 py-4">Triggered when a call is completed successfully</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">call.failed</td>
                              <td className="px-6 py-4">Triggered when a call fails to connect</td>
                            </tr>
                            <tr>
                              <td className="px-6 py-4 whitespace-nowrap font-medium">call.transferred</td>
                              <td className="px-6 py-4">Triggered when a call is transferred to a human agent</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-2">Example Webhook Payload</h3>
                      <CodeBlock code={`{
  "event_type": "call.completed",
  "timestamp": "2025-05-21T14:45:30Z",
  "call_id": "call_12345",
  "campaign_id": "campaign_67890",
  "duration": 145,
  "from": "+15557654321",
  "to": "+15551234567",
  "recording_url": "https://storage.aivoicecaller.com/recordings/call_12345.mp3",
  "transcript_url": "https://storage.aivoicecaller.com/transcripts/call_12345.json",
  "metrics": {
    "sentiment_score": 0.78,
    "talk_ratio": {
      "agent": 0.35,
      "customer": 0.65
    }
  }
}`} />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="mt-12 bg-indigo-50 rounded-lg p-8 text-center">
              <h2 className="text-2xl font-bold mb-4">Need API Support?</h2>
              <p className="text-lg text-gray-700 mb-6">Our developer team is ready to help with integration challenges.</p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link 
                  to="/contact" 
                  className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors"
                >
                  Contact Developer Support
                </Link>
                <a 
                  href="https://github.com/aivoicecaller/api-examples" 
                  className="bg-white text-indigo-600 border border-indigo-600 px-6 py-3 rounded-md font-medium hover:bg-indigo-50 transition-colors"
                >
                  View Example Code
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ApiDocumentation;
