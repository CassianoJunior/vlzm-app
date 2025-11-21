# Architecture

## Application Architecture

### Frontend Architecture

#### State Management Strategy

1. **Server State** (TanStack Query)
   - All data fetching and mutations
   - Automatic caching and invalidation
   - Optimistic updates for better UX
   - Stale time: 5 minutes

2. **Auth State** (React Context)
   - User session management
   - Profile data
   - Role-based permissions
   - Persisted via Supabase Auth

3. **UI State** (Component State)
   - Form inputs (React Hook Form)
   - Loading states
   - Error messages
   - Modal/dialog states

#### Component Architecture

```
App (Router + Providers)
├── QueryClientProvider
│   └── AuthProvider
│       ├── PublicRoute
│       │   ├── SignIn
│       │   └── SignUp
│       └── ProtectedRoute (Layout)
│           ├── Events
│           ├── CreateEvent (ManagerRoute)
│           ├── UpdateEvent (ManagerRoute)
│           └── EventCheckIn
```

#### Route Guards

1. **PublicRoute**: Redirects authenticated users to /events
2. **ProtectedRoute**: Requires authentication, wraps with Layout
3. **ManagerRoute**: Requires manager role, redirects players to /events

### Backend Architecture (Supabase)

#### Authentication Flow

```
Sign Up
├── Supabase Auth creates user
├── Trigger: on_auth_user_created
│   └── Creates profile record
│       ├── id (from auth.users)
│       ├── email
│       ├── surname (from metadata)
│       ├── sex (from metadata)
│       └── role (default: 'player')
└── Auto sign-in
```

#### Data Flow

```
Component
├── Hook (useEvents, useEventPlayers)
│   └── TanStack Query
│       ├── Cache Check
│       ├── Supabase Client
│       │   └── PostgreSQL
│       │       └── RLS Policies
│       └── Cache Update
└── UI Update
```

#### Real-time Considerations

- Currently using polling via TanStack Query
- Future: Can add Supabase real-time subscriptions for live updates
- Query invalidation triggers refetch

### Data Access Patterns

#### Read Operations
- Events list: JOIN with creator profile
- Event players: JOIN with player profile
- Single event: JOIN with creator profile
- Player check-in status: Filter by event + player

#### Write Operations
- Create event: Manager only, auto-set created_by
- Update event: Manager only, check ownership via RLS
- Delete event: Manager only, cascades to event_players
- Check-in: Players (self) or Managers (any)
- Check-out: Players (self) or Managers (any)

### Security Architecture

#### Authentication
- Supabase Auth handles JWT tokens
- Automatic token refresh
- Secure cookie storage

#### Authorization
- RLS policies enforce row-level security
- Role checks in UI for UX
- Server-side enforcement via RLS
- Manager-only routes protected by route guards

#### API Security
- Supabase anon key for client
- RLS policies validate all operations
- No direct admin key exposure
- CORS handled by Supabase

### Performance Optimizations

1. **Code Splitting**
   - React Router lazy loading (can be added)
   - Dynamic imports for heavy components

2. **Caching Strategy**
   - 5-minute stale time for queries
   - Invalidation on mutations
   - Optimistic updates for instant feedback

3. **Mobile Optimization**
   - Tailwind CSS purging
   - Minimal JS bundle
   - Lazy image loading
   - Touch target optimization (44px)

4. **Database Optimization**
   - Indexes on foreign keys
   - Composite queries reduce round trips
   - Selective field fetching

### Error Handling

1. **Network Errors**
   - TanStack Query retry logic (1 retry)
   - Error boundaries (can be added)
   - User-friendly error messages

2. **Validation Errors**
   - Zod schema validation
   - React Hook Form integration
   - Field-level error display

3. **Auth Errors**
   - Redirect to sign-in on 401
   - Session expiry handling
   - Token refresh automatic

### Scalability Considerations

- **Database**: PostgreSQL scales vertically
- **File Storage**: Can add Supabase Storage for images
- **CDN**: Static assets via Vite build
- **Caching**: Redis can be added for frequently accessed data
- **Load Balancing**: Supabase handles automatically
