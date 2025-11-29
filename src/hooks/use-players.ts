import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Profile, UpdateProfile } from '@/types/database'
import type { CreatePlayerFormData } from '@/schemas/player-schema'

export function usePlayers(page: number = 1, perPage: number = 50) {
  return useQuery({
    queryKey: ['players', page, perPage],
    queryFn: async () => {
      const start = (page - 1) * perPage
      const end = page * perPage - 1

      const { data, error, count } = await supabase
        .from('players')
        .select('*', { count: 'exact' })
        .order('surname')
        .range(start, end)

      if (error) throw error
      return { items: data as Profile[] ?? [], total: count ?? 0 }
    },
  })
}

export function usePlayer(id: string | undefined) {
  return useQuery({
    queryKey: ['players', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as Profile
    },
    enabled: !!id,
  })
}

export function useCreatePlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (player: CreatePlayerFormData) => {
      // Store current session before creating new user
      const { data: sessionData } = await supabase.auth.getSession()
      const currentSession = sessionData.session

      // Use auth signup like the sign-up form
      // The handle_new_user trigger will create the profile in players table
      const { error } = await supabase.auth.signUp({
        email: player.email,
        password: player.password,
        options: {
          data: {
            surname: player.surname,
            sex: player.sex,
            role: player.role,
          },
        },
      })

      if (error) throw error

      // Restore the manager's session to prevent switching to the new user
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useUpdatePlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateProfile & { id: string }) => {
      const { data, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Profile
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
      queryClient.invalidateQueries({ queryKey: ['players', variables.id] })
    },
  })
}

export function useDeletePlayer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['players'] })
    },
  })
}

export function useAllPlayers() {
  return useQuery({
    queryKey: ['players', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('surname')

      if (error) throw error
      return data as Profile[]
    },
  })
}
