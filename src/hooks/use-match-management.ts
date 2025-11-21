import { useState, useCallback, useRef, useEffect } from 'react'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { QueueManager, createPlayer, type Team } from '@/utils/queue-management/queue-management'
import type { Event, Profile } from '@/types/database'

export interface MatchManagementState {
  playerMap: Record<string, number>
  queueState: string
}

export function useMatchManagement(event: Event) {
  const queryClient = useQueryClient()
  
  // Custom mutation for optimistic updates
  const updateMatchState = useMutation({
    mutationFn: async (newState: MatchManagementState | null) => {
      const { data, error } = await supabase
        .from('events')
        .update({ matches_state: newState as any })
        .eq('id', event.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onMutate: async (newState) => {
      await queryClient.cancelQueries({ queryKey: ['events', event.id] })
      const previousEvent = queryClient.getQueryData(['events', event.id])
      
      queryClient.setQueryData(['events', event.id], (old: any) => ({
        ...old,
        matches_state: newState
      }))
      
      return { previousEvent }
    },
    onError: (_err, _newState, context) => {
      queryClient.setQueryData(['events', event.id], context?.previousEvent)
      toast.error('Save failed - retrying...')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['events', event.id] })
    },
    retry: 3
  })

  // We use a ref for the manager to persist it across renders without triggering re-renders itself
  // but we need a state to force re-render when the manager state changes
  const queueManagerRef = useRef<QueueManager>(new QueueManager(1))
  const [managerVersion, setManagerVersion] = useState(0) // To force re-renders
  const [isSaving, setIsSaving] = useState(false)
  const [playerMap, setPlayerMap] = useState<Record<string, number>>({})
  const [loadError, setLoadError] = useState<string | null>(null)

  // Initialize QueueManager from event state
  useEffect(() => {
    if (event?.matches_state) {
      try {
        const state = event.matches_state as unknown as MatchManagementState
        if (state.playerMap) {
          setPlayerMap(state.playerMap)
        }
        
        if (state.queueState) {
           const parsed = JSON.parse(state.queueState)
           const numCourts = parsed.state?.courts?.length || 1
           
           if (queueManagerRef.current.getCourts().length !== numCourts) {
             queueManagerRef.current = new QueueManager(numCourts)
           }
           queueManagerRef.current.loadState(state.queueState)
           setManagerVersion(v => v + 1)
           setLoadError(null)
        }
      } catch (error) {
        console.error('Failed to load queue state:', error)
        const msg = error instanceof Error ? error.message : 'Unknown error'
        setLoadError(msg)
        toast.error('Failed to load match state')
      }
    }
  }, [event?.matches_state])

  const initializeManager = useCallback((courts: number) => {
    queueManagerRef.current = new QueueManager(courts)
    setManagerVersion(v => v + 1)
    setLoadError(null)
    return queueManagerRef.current
  }, [])

  const getPlayerId = useCallback((profile: Profile): number => {
    return playerMap[profile.id]
  }, [playerMap])

  const getNextPlayerId = useCallback(() => {
    const ids = Object.values(playerMap)
    return ids.length > 0 ? Math.max(...ids) + 1 : 1
  }, [playerMap])

  const ensurePlayerMapping = useCallback((profiles: Profile[]) => {
    const newMap = { ...playerMap }
    let nextId = getNextPlayerId()
    let changed = false

    profiles.forEach(p => {
      if (!newMap[p.id]) {
        newMap[p.id] = nextId++
        changed = true
      }
    })

    if (changed) {
      setPlayerMap(newMap)
    }
    return newMap
  }, [playerMap, getNextPlayerId])

  const createPlayerFromProfile = useCallback((profile: Profile, id: number) => {
    return createPlayer(id, `${profile.surname}`)
  }, [])

  const saveState = useCallback(async (
    manager: QueueManager, 
    currentPlayerMap: Record<string, number>
  ) => {
    if (event.status === 'completed') {
      toast.error('Cannot modify completed event')
      return
    }

    const queueState = manager.saveState()
    const newState: MatchManagementState = {
      playerMap: currentPlayerMap,
      queueState
    }

    setIsSaving(true)
    
    try {
      await updateMatchState.mutateAsync(newState)
    } catch (error) {
      console.error('Save failed:', error)
      // Toast handled in onError
      throw error
    } finally {
      setIsSaving(false)
    }
  }, [updateMatchState, event?.status])

  const recordResult = useCallback(async (courtId: number, scoreMap: Record<number, Team>) => {
    if (event.status === 'completed') {
      toast.error('Cannot modify completed event')
      return
    }

    const manager = queueManagerRef.current
    const snapshot = manager.saveState() // Snapshot before change

    try {
      manager.recordResult(courtId, scoreMap)
      setManagerVersion(v => v + 1) // Update UI
      
      await saveState(manager, playerMap)
    } catch (error) {
      // Rollback
      console.error('Operation failed, rolling back:', error)
      manager.loadState(snapshot)
      setManagerVersion(v => v + 1)
      
      if (error instanceof Error) {
         // If it's a logic error (InsufficientTeamsError), we show it
         toast.error(error.message)
      } else {
         toast.error('Failed to save result')
      }
      throw error
    }
  }, [playerMap, saveState, event?.status])

  const updateScore = useCallback(async (courtId: number, teamIndex: 1 | 2, delta: number) => {
    if (event.status === 'completed') {
      toast.error('Cannot modify completed event')
      return
    }

    const manager = queueManagerRef.current
    
    try {
      manager.updateScore(courtId, teamIndex, delta)
      setManagerVersion(v => v + 1) // Update UI immediately
      
      await saveState(manager, playerMap)
    } catch (error) {
      console.error('Failed to update score:', error)
      toast.error('Failed to update score')
    }
  }, [saveState, event?.status, playerMap])

  const resetQueue = useCallback(async () => {
    if (event.status === 'completed') {
      toast.error('Cannot modify completed event')
      return
    }

    try {
      await updateMatchState.mutateAsync(null)
      queueManagerRef.current = new QueueManager(1)
      setPlayerMap({})
      setManagerVersion(v => v + 1)
      toast.success('Queue reset successfully')
    } catch (error) {
      toast.error('Failed to reset queue')
    }
  }, [updateMatchState, event?.status])

  return {
    queueManager: queueManagerRef.current,
    managerVersion,
    initializeManager,
    saveState,
    isSaving,
    getPlayerId,
    ensurePlayerMapping,
    createPlayerFromProfile,
    recordResult,
    updateScore,
    resetQueue,
    playerMap,
    loadError,
  }
}
