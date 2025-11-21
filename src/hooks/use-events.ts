import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Event, InsertEvent, UpdateEvent } from '@/types/database'

export function useEvents() {
  return useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select()
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Event[]
    },
  })
}

export function useEvent(id: number | undefined, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      if (!id) return null

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id,
    refetchInterval: options?.refetchInterval,
  })
}

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (event: InsertEvent) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          event_name: event.event_name,
          date: event.date,
          status: event.status || 'scheduled',
          created_by: event.created_by || null,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useUpdateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateEvent & { id: number }) => {
      // If status is changing to canceled or completed, set ended_at
      if (updates.status === 'canceled' || updates.status === 'completed') {
        updates.ended_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      queryClient.invalidateQueries({ queryKey: ['events', data.id] })
    },
  })
}

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })
}

export function useCompletedEvents() {
  return useQuery({
    queryKey: ['completed-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('matches_state')
        .eq('status', 'completed')
        .order('ended_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return data
    },
  })
}
