
# Railway Migration Guide

This guide explains how to migrate your AI assistant SaaS from Supabase to Railway using the service layer architecture we've implemented.

## 🏗️ Architecture Overview

The frontend has been restructured with a clean service layer that abstracts all backend operations:

```
Frontend (React Components)
    ↓
Backend Service (Single Interface)
    ↓
Adapter Layer (Swappable Implementations)
    ↓
Actual Backend (Supabase → Railway)
```

## 📁 File Structure

```
src/
├── services/
│   ├── adapters/
│   │   ├── types.ts           # Adapter interfaces
│   │   ├── SupabaseAdapter.ts # Current implementation
│   │   └── RailwayAdapter.ts  # Migration target
│   ├── BackendService.ts      # Main service orchestrator
│   └── WebSocketService.ts    # Enhanced WebSocket handling
├── hooks/
│   ├── useBackendService.ts   # React hook for backend access
│   └── useEnhancedVoiceWebSocket.ts # Voice WebSocket hook
```

## 🔄 Migration Steps

### Phase 1: Railway Backend Development
*(Done outside of Lovable)*

1. **Set up Railway project**
   ```bash
   railway new your-ai-assistant-backend
   ```

2. **Implement the required API endpoints** (match the adapter interfaces):

   **Authentication endpoints:**
   - `POST /auth/signup` - User registration
   - `POST /auth/signin` - User login  
   - `POST /auth/signout` - User logout
   - `GET /auth/user` - Get current user

   **Database endpoints:**
   - `GET /api/{table}` - Select records
   - `POST /api/{table}` - Insert record
   - `PUT /api/{table}/{id}` - Update record
   - `DELETE /api/{table}/{id}` - Delete record

   **WebSocket endpoints:**
   - `WS /voice-chat` - Voice assistant WebSocket
   - `WS /realtime` - Real-time database updates

3. **Deploy to Railway**
   ```bash
   railway deploy
   ```

### Phase 2: Frontend Migration
*(Done in Lovable)*

1. **Update backend configuration** in `src/services/BackendService.ts`:
   ```typescript
   // Change these values:
   const BACKEND_TYPE: 'supabase' | 'railway' = 'railway';
   const RAILWAY_BASE_URL = 'https://your-app.railway.app';
   const RAILWAY_WS_URL = 'wss://your-app.railway.app';
   ```

2. **Test the migration**:
   - All React components remain unchanged
   - UI/UX stays exactly the same
   - Backend calls are automatically routed to Railway

## 🔧 Current Implementation Details

### Authentication Flow
```typescript
// Components use the hook:
const { auth } = useBackendService();
await auth.signIn(email, password);

// Hook calls BackendService:
BackendService → AuthAdapter → SupabaseAuthAdapter (current)
                              → RailwayAuthAdapter (future)
```

### Database Operations
```typescript
// Components use:
const { database } = useBackendService();
const users = await database.select('users', { where: { active: true } });

// Flows through:
BackendService → DatabaseAdapter → SupabaseDatabaseAdapter (current)
                                 → RailwayDatabaseAdapter (future)
```

### Voice WebSocket
```typescript
// Components use:
const { voice } = useBackendService();
const wsUrl = voice.createWebSocketUrl('voice-chat', { userId });

// Enhanced WebSocket service handles:
- Automatic reconnection with exponential backoff
- Error recovery and logging
- Message queuing during disconnections
- Connection state management
```

## 🎯 Migration Benefits

### Before (Direct Supabase Usage)
```typescript
// Components directly coupled to Supabase
import { supabase } from '@/lib/supabase';

const { data, error } = await supabase.from('users').select();
// ❌ Hard to test, hard to migrate, WebSocket issues
```

### After (Service Layer)
```typescript
// Components use abstracted service
const { database } = useBackendService();
const users = await database.select('users');
// ✅ Easy to test, easy to migrate, robust WebSocket handling
```

## 🔍 Key Improvements

### 1. WebSocket Reliability
- **Automatic reconnection** with exponential backoff
- **Error handling** for 1006 and other connection issues  
- **Message queuing** during disconnections
- **Connection state tracking** for better UX

### 2. Migration Readiness
- **Zero component changes** needed for migration
- **Adapter pattern** allows swapping backends
- **Interface compliance** ensures compatibility
- **Gradual migration** possible (test one service at a time)

### 3. Better Error Handling
- **Consistent error messages** across all backends
- **Detailed logging** for debugging
- **Graceful degradation** when services fail
- **User-friendly error states** in components

## 🧪 Testing Strategy

### Current State Testing
1. **Verify all features work** with current Supabase backend
2. **Test WebSocket reliability** - should handle connection drops gracefully
3. **Check error handling** - should show meaningful messages to users

### Migration Testing
1. **Deploy Railway backend** with matching API contract
2. **Switch BACKEND_TYPE** to 'railway' in BackendService.ts
3. **Test each feature** systematically:
   - User authentication (signup/signin/signout)
   - Database operations (CRUD)
   - Real-time updates
   - Voice WebSocket connections
   - Error scenarios

### Rollback Plan
If issues arise during migration:
1. Change `BACKEND_TYPE` back to 'supabase'
2. All functionality returns to original state
3. No data loss or UI changes

## 📋 Migration Checklist

### Pre-Migration
- [ ] Verify current app works with improved WebSocket handling
- [ ] Document all current API usage patterns
- [ ] Test error scenarios and recovery

### Railway Backend Setup
- [ ] Create Railway project
- [ ] Implement auth endpoints
- [ ] Implement database endpoints  
- [ ] Implement WebSocket endpoints
- [ ] Deploy and test individually

### Frontend Migration
- [ ] Update BACKEND_TYPE in BackendService.ts
- [ ] Update RAILWAY_BASE_URL and RAILWAY_WS_URL
- [ ] Test authentication flow
- [ ] Test database operations
- [ ] Test real-time features
- [ ] Test voice WebSocket connections
- [ ] Test error handling and recovery

### Post-Migration
- [ ] Monitor performance and errors
- [ ] Update any Railway-specific configurations
- [ ] Document any differences from Supabase behavior
- [ ] Plan Supabase resource cleanup

## 🎉 Expected Outcome

After migration, you'll have:
- **Same UI/UX** - Users see no difference
- **Improved reliability** - Better WebSocket handling eliminates 1006 errors
- **Railway hosting** - More reliable infrastructure
- **Maintained functionality** - All features work exactly the same
- **Future flexibility** - Easy to switch backends again if needed

The service layer architecture ensures that this migration is smooth, testable, and reversible while providing immediate improvements to WebSocket reliability.
