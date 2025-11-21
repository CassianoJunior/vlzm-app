# Database Schema

## Supabase PostgreSQL Schema

### Tables

#### profiles

Stores user profile information. Created automatically via trigger when a user signs up.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  surname TEXT NOT NULL,
  sex TEXT NOT NULL CHECK (sex IN ('M', 'F')),
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'manager')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX profiles_email_idx ON profiles(email);
CREATE INDEX profiles_role_idx ON profiles(role);
```

**Columns:**
- `id`: UUID, primary key, references auth.users
- `email`: User's email address
- `surname`: User's last name
- `sex`: Biological sex ('M' or 'F')
- `role`: User role ('player' or 'manager')
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

#### events

Stores event information created by managers.

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' 
    CHECK (status IN ('scheduled', 'ongoing', 'completed', 'canceled')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Indexes
CREATE INDEX events_created_by_idx ON events(created_by);
CREATE INDEX events_status_idx ON events(status);
CREATE INDEX events_start_time_idx ON events(start_time DESC);
```

**Columns:**
- `id`: UUID, primary key
- `title`: Event title (required)
- `description`: Optional event description
- `location`: Optional event location
- `start_time`: Event start datetime
- `end_time`: Event end datetime
- `status`: Event status (scheduled/ongoing/completed/canceled)
- `created_by`: Manager who created the event
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**
- `valid_time_range`: Ensures end_time is after start_time

#### event_players

Junction table for event attendance and check-in/check-out tracking.

```sql
CREATE TABLE event_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, player_id)
);

-- Indexes
CREATE INDEX event_players_event_id_idx ON event_players(event_id);
CREATE INDEX event_players_player_id_idx ON event_players(player_id);
CREATE INDEX event_players_checked_in_at_idx ON event_players(checked_in_at);
```

**Columns:**
- `id`: UUID, primary key
- `event_id`: Reference to the event
- `player_id`: Reference to the player
- `checked_in_at`: Timestamp when player checked in (null if not checked in)
- `checked_out_at`: Timestamp when player checked out (null if not checked out)
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Constraints:**
- `UNIQUE(event_id, player_id)`: One record per player per event

### Triggers

#### Profile Creation Trigger

Automatically creates a profile when a user signs up.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, surname, sex, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'surname', 'Unknown'),
    COALESCE(NEW.raw_user_meta_data->>'sex', 'M'),
    'player'  -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

#### Updated At Trigger

Automatically updates the `updated_at` timestamp.

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER handle_event_players_updated_at
  BEFORE UPDATE ON event_players
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();
```

### Relationships

```
auth.users (1) ─────> (1) profiles
                            │
                            ├─ (1) ──> (N) events (as creator)
                            │
                            └─ (1) ──> (N) event_players (as player)
                                         │
                                         └─ (N) <── (1) events
```

### Enums (TypeScript)

While PostgreSQL uses TEXT with CHECK constraints, TypeScript defines these as enums:

```typescript
export type EventStatus = 'scheduled' | 'ongoing' | 'completed' | 'canceled'
export type Role = 'player' | 'manager'
export type Sex = 'M' | 'F'
```

### Data Validation

1. **Database Level**
   - NOT NULL constraints
   - CHECK constraints for enums
   - UNIQUE constraints
   - Foreign key constraints
   - Custom CHECK constraints (time ranges)

2. **Application Level**
   - Zod schemas for form validation
   - TypeScript types for compile-time checks
   - React Hook Form integration

### Migration Strategy

To set up the database:

1. Create tables in order: profiles → events → event_players
2. Create indexes for performance
3. Create triggers for automation
4. Set up RLS policies (see 04-rls-policies.md)
5. Test with sample data

### Sample Data

```sql
-- Sample manager
INSERT INTO profiles (id, email, surname, sex, role) VALUES
  ('uuid-manager', 'manager@example.com', 'Manager', 'M', 'manager');

-- Sample players
INSERT INTO profiles (id, email, surname, sex, role) VALUES
  ('uuid-player1', 'player1@example.com', 'Player One', 'M', 'player'),
  ('uuid-player2', 'player2@example.com', 'Player Two', 'F', 'player');

-- Sample event
INSERT INTO events (id, title, description, location, start_time, end_time, status, created_by) VALUES
  ('uuid-event1', 'Weekly Volleyball', 'Regular training session', 'Gym A', 
   NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', 
   'scheduled', 'uuid-manager');
```
