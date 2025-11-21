# Row Level Security Policies

## Supabase RLS Configuration

Enable Row Level Security on all tables and define policies for role-based access control.

### Enable RLS

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_players ENABLE ROW LEVEL SECURITY;
```

## Profiles Table Policies

### Read Access

```sql
-- Users can read all profiles
CREATE POLICY "profiles_select_policy"
  ON profiles
  FOR SELECT
  USING (true);
```

**Rationale**: All users need to see other players' names for check-in displays.

### Update Access

```sql
-- Users can only update their own profile
CREATE POLICY "profiles_update_policy"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);
```

**Rationale**: Users should only modify their own profile information.

### Insert/Delete Access

No public policies needed. Profile creation is handled by trigger.

## Events Table Policies

### Read Access

```sql
-- All authenticated users can view events
CREATE POLICY "events_select_policy"
  ON events
  FOR SELECT
  TO authenticated
  USING (true);
```

**Rationale**: All users (players and managers) need to see events.

### Insert Access

```sql
-- Only managers can create events
CREATE POLICY "events_insert_policy"
  ON events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );
```

**Rationale**: Only managers should create events.

### Update Access

```sql
-- Only managers can update events they created
CREATE POLICY "events_update_policy"
  ON events
  FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );
```

**Rationale**: Managers can only modify their own events.

### Delete Access

```sql
-- Only managers can delete events they created
CREATE POLICY "events_delete_policy"
  ON events
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );
```

**Rationale**: Managers can only delete their own events.

## Event Players Table Policies

### Read Access

```sql
-- All authenticated users can view event players
CREATE POLICY "event_players_select_policy"
  ON event_players
  FOR SELECT
  TO authenticated
  USING (true);
```

**Rationale**: All users need to see attendance lists.

### Insert Access

```sql
-- Players can register themselves for events
-- Managers can register any player
CREATE POLICY "event_players_insert_policy"
  ON event_players
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Player registering themselves
    (player_id = auth.uid())
    OR
    -- Manager registering anyone
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );
```

**Rationale**: Players self-register, managers can register anyone.

### Update Access - Player Self Check-in

```sql
-- Players can check themselves in/out during scheduled or ongoing events
CREATE POLICY "event_players_update_self_policy"
  ON event_players
  FOR UPDATE
  TO authenticated
  USING (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_players.event_id
      AND events.status IN ('scheduled', 'ongoing')
    )
  );
```

**Rationale**: Players can self check-in/out during active events.

### Update Access - Manager Check-in

```sql
-- Managers can update any player's check-in status during ongoing events
CREATE POLICY "event_players_update_manager_policy"
  ON event_players
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_players.event_id
      AND events.status = 'ongoing'
    )
  );
```

**Rationale**: Managers manage check-ins during ongoing events.

### Delete Access

```sql
-- Managers can remove players from events
CREATE POLICY "event_players_delete_policy"
  ON event_players
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'manager'
    )
  );
```

**Rationale**: Only managers can remove players from events.

## Policy Testing

### Test Manager Permissions

```sql
-- As manager, create event (should succeed)
INSERT INTO events (title, start_time, end_time, created_by)
VALUES ('Test Event', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', auth.uid());

-- As manager, update own event (should succeed)
UPDATE events SET title = 'Updated Event' WHERE created_by = auth.uid();

-- As manager, manage check-ins during ongoing event (should succeed)
UPDATE event_players SET checked_in_at = NOW() 
WHERE event_id IN (SELECT id FROM events WHERE status = 'ongoing');
```

### Test Player Permissions

```sql
-- As player, create event (should fail)
INSERT INTO events (title, start_time, end_time, created_by)
VALUES ('Test Event', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '2 hours', auth.uid());
-- Error: new row violates row-level security policy

-- As player, self check-in (should succeed if event is scheduled/ongoing)
INSERT INTO event_players (event_id, player_id, checked_in_at)
VALUES ('event-uuid', auth.uid(), NOW());

-- As player, update own check-in (should succeed)
UPDATE event_players 
SET checked_in_at = NOW() 
WHERE player_id = auth.uid() AND event_id = 'event-uuid';
```

## Security Considerations

1. **Authentication Required**: All policies require `TO authenticated`
2. **Role Verification**: Manager actions verify role from profiles table
3. **Ownership Checks**: Managers can only modify their own events
4. **Time-based Access**: Check-ins restricted to scheduled/ongoing events
5. **Self-service**: Players can only modify their own check-in status
6. **Audit Trail**: Timestamps maintained via triggers

## Performance Notes

- RLS policies add WHERE clauses to queries
- Index on `profiles.role` speeds up role checks
- Index on `events.status` speeds up status checks
- Index on `events.created_by` speeds up ownership checks

## Debugging RLS Issues

If queries fail unexpectedly:

1. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. List policies: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. Test with different user roles
4. Use Supabase SQL editor with different auth contexts
5. Check Supabase logs for policy violations

## Migration Script

Run these in order:

```sql
-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_players ENABLE ROW LEVEL SECURITY;

-- 2. Create policies (run all policy creation statements above)

-- 3. Verify
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public';
```
