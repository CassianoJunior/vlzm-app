# Copilot Instructions for VLZM Event Management App

## Architecture Overview

**Stack**: React 19 + TypeScript, Vite 7, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), TanStack Query v5

This is a mobile-first volleyball event management app with player check-in/check-out and role-based permissions.

### Critical Data Flow Pattern

```
Component → Custom Hook → TanStack Query → Supabase Client → PostgreSQL (RLS enforced)
```

**Security Model**: All authorization happens server-side via Supabase RLS policies. UI role checks are for UX only—never trust them for security decisions.

## Database & State Management

### Table Names & Quirks

- **Auth is synced to profiles**: `auth.users` triggers auto-create profile via `handle_new_user()` function
- **profiles table is aliased as "players"** in Supabase queries (see `auth-context.tsx` line 46: `.from('players')`)
- **event_players junction table**: tracks attendance with `checked_in_at` and `checked_out_at` nullable timestamps
- Primary keys use UUID except `events` table (uses integer `id`)

### State Management Rules

1. **Server state**: Always use TanStack Query (see `src/hooks/`)
   - Queries have 5-minute stale time, 1 retry
   - Mutations must invalidate relevant query keys
   - Example: `useCreateEvent()` invalidates `['events']` on success

2. **Auth state**: Single source via `AuthProvider` context
   - Profile fetched via `.from('players')` (not 'profiles')
   - Exposes `isManager` and `isPlayer` computed booleans
   - Auth changes auto-refetch profile

3. **Form state**: React Hook Form + Zod schemas
   - Schemas in `src/schemas/` define validation
   - Use `@hookform/resolvers/zod` for integration

## File Naming & Structure Conventions

- **Files**: Always kebab-case (e.g., `event-check-in.tsx`, `use-events.ts`)
- **Components**: PascalCase exports, kebab-case files
- **Hooks**: Prefix with `use-`, return mutation objects from TanStack Query (e.g., `checkIn.mutateAsync()`)
- **Types**: Export from `src/types/database.ts` which wraps auto-generated `database-generated.ts`

### Import Pattern

Always use `@/` path alias for `src/` (configured in `tsconfig.json` and `vite.config.ts`):

```typescript
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/auth-context'
import type { Event } from '@/types/database'
```

## Role-Based Access Patterns

### Manager Capabilities
- Create/update/delete events they created (RLS enforces ownership via `created_by`)
- Check-in/out ANY player during `'ongoing'` events only
- See "Create" button in mobile nav and desktop UI

### Player Capabilities
- Self check-in/out during `'scheduled'` OR `'ongoing'` events
- View all events and attendance lists
- Cannot modify other players' attendance

### Implementation Pattern

```typescript
// UI guards for UX (not security!)
{isManager && (
  <Link to="/events/create">Create Event</Link>
)}

// Route guards in App.tsx
<Route element={<ManagerRoute />}>
  <Route path="/events/create" element={<CreateEvent />} />
</Route>

// RLS policies enforce actual security at database level
```

## Mobile-First Design Standards

**Critical Rule**: All interactive elements must have **minimum 44px touch targets** (iOS/Android accessibility standard).

```tsx
// ✅ Correct
<button className="min-h-11 px-4 py-2.5">Check In</button>

// ❌ Wrong - too small for mobile
<button className="py-1 px-2 text-sm">Check In</button>
```

### Responsive Patterns

- Mobile: Cards with bottom navigation (hidden on `md:` breakpoint)
- Desktop: Tables with top navigation
- Layout adds `pb-20` to content, `md:pb-6` to avoid bottom nav overlap

## Common Tasks

### Adding a New Query Hook

```typescript
// In src/hooks/use-*.ts
export function useEventPlayers(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event-players', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_players')
        .select('*, player:players(*)')  // Join syntax
        .eq('event_id', eventId)
      
      if (error) throw error
      return data
    },
    enabled: !!eventId,  // Don't fetch if eventId is undefined
  })
}
```

### Adding a New Mutation Hook

```typescript
export function useCheckIn() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ eventId, playerId }: { eventId: number; playerId: string }) => {
      // Upsert pattern for check-in
      const { error } = await supabase
        .from('event_players')
        .upsert({ 
          event_id: eventId, 
          player_id: playerId, 
          checked_in_at: new Date().toISOString() 
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      // Always invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['event-players'] })
    },
  })
}
```

### Testing RLS Policies

When adding new features that interact with the database:

1. Test as **different roles** (sign in as manager vs player)
2. Check Supabase logs for policy violations
3. Verify policies in `dev-docs/04-rls-policies.md` cover the operation
4. Remember: RLS policies use `auth.uid()` for current user

## Development Workflow

```bash
# Start dev server (includes hot reload)
pnpm dev

# Build production bundle (type-checks first)
pnpm build

# Preview production build locally
pnpm preview
```

### Environment Setup

Required `.env` variables:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Missing env vars throw at app init (see `src/lib/supabase.ts`).

## Key Files Reference

- **Database types**: `src/types/database.ts` (manually maintained wrapper) + `database-generated.ts` (auto-generated)
- **RLS policies**: `dev-docs/04-rls-policies.md` (authoritative documentation)
- **Schema**: `dev-docs/03-database-schema.md` (includes SQL for triggers)
- **Auth flow**: `src/contexts/auth-context.tsx` (profile fetch quirk: uses 'players' table name)
- **Route guards**: `src/components/protected-route.tsx` (PublicRoute, ProtectedRoute, ManagerRoute)

## Common Pitfalls

1. **Don't query 'profiles' table** — use 'players' (Supabase table alias issue)
2. **Manager check-in restrictions**: Only works during `status = 'ongoing'`, NOT 'scheduled'
3. **Player self check-in**: Works during 'scheduled' OR 'ongoing'
4. **Event status flow**: scheduled → ongoing → completed (or canceled)
5. **Mutation invalidation**: Always invalidate both list and detail queries (e.g., `['events']` AND `['events', id]`)

## When Modifying RLS Policies

1. Update SQL in Supabase dashboard
2. Document changes in `dev-docs/04-rls-policies.md`
3. Update TypeScript types if schema changes
4. Test with both player and manager accounts

## Useful Supabase Patterns

```typescript
// Join with related table (note: uses singular table names in select)
.select('*, creator:players(surname, role)')

// Upsert for check-in (conflict on unique constraint)
.upsert({ event_id, player_id, checked_in_at })

// Soft filtering (no error if not found)
.eq('status', 'ongoing').maybeSingle()

// Hard filtering (throws if not found)
.eq('id', eventId).single()
```
