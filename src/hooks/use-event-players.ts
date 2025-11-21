import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useEventPlayers(eventId: number | undefined) {
  return useQuery({
    queryKey: ['event-players', eventId],
    queryFn: async () => {
      if (!eventId) return []
      
      const { data, error } = await supabase
        .from('event_players')
        .select('*, player:players(*)')
        .eq('event_id', eventId)
        .order('checked_in_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!eventId,
  })
}

export function usePlayerCheckInStatus(eventId: number | undefined, playerId: string | undefined) {
  return useQuery({
    queryKey: ['event-player-status', eventId, playerId],
    queryFn: async () => {
      if (!eventId || !playerId) return null

      const { data, error } = await supabase
        .from('event_players')
        .select('*')
        .eq('event_id', eventId)
        .eq('player_id', playerId)
        .maybeSingle()

      if (error) throw error
      return data
    },
    enabled: !!eventId && !!playerId,
  })
}

export function useCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { eventId: number; playerId: string }) => {
      // Check if already checked in
      const { data: existing } = await supabase
        .from('event_players')
        .select('*')
        .eq('event_id', params.eventId)
        .eq('player_id', params.playerId)
        .maybeSingle()

      if (existing) {
        // Update check-in time
        const { data, error } = await supabase
          .from('event_players')
          .update({
            checked_in_at: new Date().toISOString(),
            checked_in: true,
          })
          .eq('id', existing.id)
          .select()
          .single()

        if (error) throw error
        return data
      } else {
        // Create new check-in
        const { data, error } = await supabase
          .from('event_players')
          .insert({
            event_id: params.eventId,
            player_id: params.playerId,
            checked_in_at: new Date().toISOString(),
            checked_in: true,
          })
          .select()
          .single()

        if (error) throw error
        return data
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['event-players', variables.eventId] })
      queryClient.invalidateQueries({ 
        queryKey: ['event-player', variables.eventId, variables.playerId] 
      })
    },
  })
}

export function useCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { eventId: number; playerId: string }) => {
      // Find the event player record
      const { data: existing } = await supabase
        .from('event_players')
        .select('*')
        .eq('event_id', params.eventId)
        .eq('player_id', params.playerId)
        .single()

      if (!existing) {
        throw new Error('Not checked in')
      }

      const { data, error } = await supabase
        .from('event_players')
        .update({
          checked_out_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-players', data.event_id] })
    },
  })
}

export function useManagerCheckIn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { eventPlayerId: number; checkedInAt: string | null }) => {
      const { data, error } = await supabase
        .from('event_players')
        .update({
          checked_in_at: params.checkedInAt,
          checked_in: params.checkedInAt !== null,
        })
        .eq('id', params.eventPlayerId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-players', data.event_id] })
    },
  })
}

export function useManagerCheckOut() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { eventPlayerId: number; checkedOutAt: string | null }) => {
      const { data, error } = await supabase
        .from('event_players')
        .update({
          checked_out_at: params.checkedOutAt,
        })
        .eq('id', params.eventPlayerId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event-players', data.event_id] })
    },
  })
}
