
# AI Voice Calling Agent Project Setup Script

# Create base directories
$directories = @(
    "src/assets/images",
    "src/components/Layout",
    "src/components/ui",
    "src/components/CallCenter",
    "src/components/Dashboard",
    "src/components/Landing",
    "src/components/Chatbot",
    "src/context",
    "src/hooks",
    "src/lib",
    "src/pages",
    "src/services",
    "src/services/api",
    "src/services/voice",
    "src/types",
    "src/utils",
    "public",
    "server",
    "server/controllers",
    "server/models",
    "server/routes",
    "server/utils",
    "server/middleware"
)

# Create directories
foreach ($dir in $directories) {
    if (!(Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force
        Write-Host "Created directory: $dir"
    }
}

# Install core dependencies for frontend
Write-Host "Installing core frontend dependencies..."
npm install react react-dom react-router-dom axios @tanstack/react-query tailwindcss lucide-react sonner wavesurfer.js recharts

# Install UI component libraries
Write-Host "Installing UI component libraries..."
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar 
npm install @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog 
npm install @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar
npm install @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group
npm install @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider
npm install @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast
npm install @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip

# Install form libraries
Write-Host "Installing form and utility libraries..."
npm install zod @hookform/resolvers react-hook-form class-variance-authority clsx tailwind-merge cmdk
npm install date-fns embla-carousel-react input-otp next-themes react-day-picker
npm install react-resizable-panels tailwindcss-animate vaul

# Install backend dependencies
Write-Host "Installing backend dependencies..."
npm install express cors dotenv mongoose bcryptjs jsonwebtoken uuid express-validator morgan winston multer

# Install dev dependencies
Write-Host "Installing dev dependencies..."
npm install -D tailwindcss postcss autoprefixer @types/wavesurfer.js @types/react @types/react-dom typescript ts-node nodemon
npm install -D @types/express @types/cors @types/bcryptjs @types/jsonwebtoken @types/morgan @types/multer @types/node concurrently

# Initialize Tailwind CSS
Write-Host "Initializing Tailwind CSS..."
npx tailwindcss init -p

# Configure environment variables
Write-Host "Setting up environment variables..."
$envContent = @"
VITE_API_URL=http://localhost:8000/api
PORT=8000
MONGODB_URI=mongodb://localhost:27017/aivoicecaller
JWT_SECRET=your_jwt_secret_key_here
"@

$envContent | Out-File -FilePath ".env" -Encoding utf8 -NoNewline

# Create TypeScript config files
Write-Host "Creating TypeScript configuration..."

# Frontend tsconfig.json
$tsconfigContent = @"
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
"@
$tsconfigContent | Out-File -FilePath "tsconfig.json" -Encoding utf8 -NoNewline

# Backend tsconfig.json
$serverTsconfigContent = @"
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./server",
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["server/**/*.ts"],
  "exclude": ["node_modules"]
}
"@
$serverTsconfigContent | Out-File -FilePath "tsconfig.server.json" -Encoding utf8 -NoNewline

# Create package.json scripts
Write-Host "Updating package.json scripts..."
$packageJsonContent = @"
{
  "name": "ai-voice-caller",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "server": "nodemon --exec ts-node --project tsconfig.server.json server/index.ts",
    "start": "concurrently \"npm run dev\" \"npm run server\""
  }
}
"@
$packageJsonContent | Out-File -FilePath "package.json.tmp" -Encoding utf8 -NoNewline

# Create initial backend files
Write-Host "Creating backend files..."

# Server Entry Point
$serverIndexContent = @"
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import authRoutes from './routes/auth.routes';
import campaignRoutes from './routes/campaign.routes';
import callRoutes from './routes/call.routes';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aivoicecaller')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/calls', callRoutes);

// Error handling middleware
app.use(errorHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', environment: process.env.NODE_ENV });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
"@
$serverIndexContent | Out-File -FilePath "server/index.ts" -Encoding utf8 -NoNewline

# User Model
$userModelContent = @"
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  name: string;
  email: string;
  password: string;
  avatar?: string;
  role: 'admin' | 'user';
  createdAt?: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
"@
$userModelContent | Out-File -FilePath "server/models/user.model.ts" -Encoding utf8 -NoNewline

# Campaign Model
$campaignModelContent = @"
import mongoose from 'mongoose';

export interface ICampaign {
  name: string;
  status: 'draft' | 'active' | 'paused' | 'completed';
  createdAt: Date;
  updatedAt?: Date;
  description?: string;
  scriptId?: string;
  script?: string;
  callsMade?: number;
  callsAnswered?: number;
  avgCallDuration?: number;
  userId: mongoose.Types.ObjectId;
}

const campaignSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed'],
    default: 'draft'
  },
  description: {
    type: String,
    trim: true
  },
  script: {
    type: String
  },
  scriptId: {
    type: String
  },
  callsMade: {
    type: Number,
    default: 0
  },
  callsAnswered: {
    type: Number,
    default: 0
  },
  avgCallDuration: {
    type: Number,
    default: 0
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

const Campaign = mongoose.model<ICampaign>('Campaign', campaignSchema);

export default Campaign;
"@
$campaignModelContent | Out-File -FilePath "server/models/campaign.model.ts" -Encoding utf8 -NoNewline

# Call Model
$callModelContent = @"
import mongoose from 'mongoose';

export interface ICall {
  campaignId: mongoose.Types.ObjectId;
  contactName?: string;
  contactPhone?: string;
  contactId?: string;
  status: 'planned' | 'in-progress' | 'completed' | 'failed' | 'no-answer' | 'transferred';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  recordingUrl?: string;
  transcriptUrl?: string;
  transcript?: string;
  notes?: string;
  userId: mongoose.Types.ObjectId;
}

const callSchema = new mongoose.Schema({
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Campaign',
    required: true
  },
  contactName: {
    type: String
  },
  contactPhone: {
    type: String
  },
  contactId: {
    type: String
  },
  status: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'failed', 'no-answer', 'transferred'],
    default: 'planned'
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number
  },
  recordingUrl: {
    type: String
  },
  transcriptUrl: {
    type: String
  },
  transcript: {
    type: String
  },
  notes: {
    type: String
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const Call = mongoose.model<ICall>('Call', callSchema);

export default Call;
"@
$callModelContent | Out-File -FilePath "server/models/call.model.ts" -Encoding utf8 -NoNewline

# Create auth controller
$authControllerContent = @"
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/user.model';
import { validationResult } from 'express-validator';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

// Generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
};

// Register a new user
export const register = async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: 'user'
    });

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    
    // Find user
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      createdAt: user.createdAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Logout user
export const logout = async (req: Request, res: Response) => {
  // JWT is stateless, so we don't need to do anything server-side
  // The client should remove the token from storage
  res.json({ message: 'Logged out successfully' });
};
"@
$authControllerContent | Out-File -FilePath "server/controllers/auth.controller.ts" -Encoding utf8 -NoNewline

# Create auth routes
$authRoutesContent = @"
import { Router } from 'express';
import { register, login, getProfile, logout } from '../controllers/auth.controller';
import { check } from 'express-validator';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Register route
router.post(
  '/register',
  [
    check('name', 'Name is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 6 or more characters').isLength({ min: 6 })
  ],
  register
);

// Login route
router.post(
  '/login',
  [
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password is required').exists()
  ],
  login
);

// Get user profile
router.get('/profile', authMiddleware, getProfile);

// Logout route
router.post('/logout', logout);

export default router;
"@
$authRoutesContent | Out-File -FilePath "server/routes/auth.routes.ts" -Encoding utf8 -NoNewline

# Create campaign routes
$campaignRoutesContent = @"
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
// Import controllers later when implemented
// import { getCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign } from '../controllers/campaign.controller';

const router = Router();

// Protected routes
router.use(authMiddleware);

// Get all campaigns
router.get('/', (req, res) => {
  res.json({ message: 'Get all campaigns - To be implemented' });
});

// Get a single campaign
router.get('/:id', (req, res) => {
  res.json({ message: 'Get campaign - To be implemented' });
});

// Create a campaign
router.post('/', (req, res) => {
  res.json({ message: 'Create campaign - To be implemented' });
});

// Update a campaign
router.put('/:id', (req, res) => {
  res.json({ message: 'Update campaign - To be implemented' });
});

// Delete a campaign
router.delete('/:id', (req, res) => {
  res.json({ message: 'Delete campaign - To be implemented' });
});

export default router;
"@
$campaignRoutesContent | Out-File -FilePath "server/routes/campaign.routes.ts" -Encoding utf8 -NoNewline

# Create call routes
$callRoutesContent = @"
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
// Import controllers later when implemented
// import { getCalls, getCall, initiateCall, updateCallStatus } from '../controllers/call.controller';

const router = Router();

// Protected routes
router.use(authMiddleware);

// Get all calls
router.get('/', (req, res) => {
  res.json({ message: 'Get all calls - To be implemented' });
});

// Get a single call
router.get('/:id', (req, res) => {
  res.json({ message: 'Get call - To be implemented' });
});

// Get calls for a campaign
router.get('/campaign/:campaignId', (req, res) => {
  res.json({ message: 'Get calls by campaign - To be implemented' });
});

// Initiate a call
router.post('/', (req, res) => {
  res.json({ message: 'Initiate call - To be implemented' });
});

// Update call status
router.put('/:id/status', (req, res) => {
  res.json({ message: 'Update call status - To be implemented' });
});

export default router;
"@
$callRoutesContent | Out-File -FilePath "server/routes/call.routes.ts" -Encoding utf8 -NoNewline

# Create auth middleware
$authMiddlewareContent = @"
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    
    // Add userId to request
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
"@
$authMiddlewareContent | Out-File -FilePath "server/middleware/authMiddleware.ts" -Encoding utf8 -NoNewline

# Create error handler middleware
$errorHandlerContent = @"
import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  res.status(500).json({
    message: 'Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};
"@
$errorHandlerContent | Out-File -FilePath "server/middleware/errorHandler.ts" -Encoding utf8 -NoNewline

# Fix the issue with CallCenter.tsx
$callCenterContent = @"
import { useEffect, useState } from 'react';
import { Call, CallStatus } from '@/types';

export const useCallCenter = () => {
  const [status, setStatus] = useState<CallStatus>('idle');
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [callTime, setCallTime] = useState<number>(0);

  // Timer for call duration
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (status === 'connected' || status === 'calling') {
      timer = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    } else {
      setCallTime(0);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status]);

  const startCall = async (campaignId: string, contactId: string) => {
    try {
      setStatus('calling');
      // API call to start call would go here
      setTimeout(() => {
        setStatus('connected');
        setCurrentCall({
          id: 'temp-id',
          campaignId,
          contactId,
          status: 'in-progress',
          contactName: 'John Doe',
          contactPhone: '+1234567890'
        });
      }, 2000);
    } catch (error) {
      console.error('Error starting call:', error);
      setStatus('idle');
    }
  };

  const endCall = () => {
    setStatus('idle');
    setCurrentCall(null);
    setTranscript('');
  };

  return {
    status,
    currentCall,
    transcript,
    callTime,
    startCall,
    endCall
  };
};

export default useCallCenter;
"@
$callCenterContent | Out-File -FilePath "src/hooks/useCallCenter.ts" -Encoding utf8 -NoNewline

# Fix the API service to use import.meta.env
$apiServiceContent = @"
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
"@
$apiServiceContent | Out-File -FilePath "src/services/api/index.ts" -Encoding utf8 -NoNewline

Write-Host "`nProject structure and files created successfully!"
Write-Host "Next steps:"
Write-Host "1. Review and modify the installed dependencies as needed"
Write-Host "2. Run 'npm run dev' to start the development server"
Write-Host "3. Run 'npm run server' to start the backend server"
Write-Host "4. Access your application at http://localhost:8080"
Write-Host "5. Backend API will be available at http://localhost:8000/api"
