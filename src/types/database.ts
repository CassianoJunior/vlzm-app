export type { Database } from './database-generated'
import type { Database } from './database-generated'

// Helper types
export type Profile = Database['public']['Tables']['players']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type EventPlayer = Database['public']['Tables']['event_players']['Row']

export type InsertProfile = Database['public']['Tables']['players']['Insert']
export type InsertEvent = Database['public']['Tables']['events']['Insert']
export type InsertEventPlayer = Database['public']['Tables']['event_players']['Insert']

export type UpdateProfile = Database['public']['Tables']['players']['Update']
export type UpdateEvent = Database['public']['Tables']['events']['Update']
export type UpdateEventPlayer = Database['public']['Tables']['event_players']['Update']

// Enums
export type EventStatus = Database['public']['Enums']['EventStatus']
export type Role = Database['public']['Enums']['Role']

// Extended types with relations
export interface EventWithCreator extends Event {
  creator?: Profile
}

export interface EventPlayerWithDetails extends EventPlayer {
  player?: Profile
  event?: Event
}
