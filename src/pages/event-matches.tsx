import { useState, useEffect, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { X, Crown, ArrowLeft, Trophy, Users, History, PlayCircle, Plus, Minus, Wand2, Maximize2, Minimize2, Timer, ChevronUp, ChevronDown, GripVertical, UserPlus, Undo2, Redo2, Pencil, Lock, Unlock, MoreVertical } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useEvent, useUpdateEvent, useCompletedEvents } from '@/hooks/use-events'
import { useEventPlayers } from '@/hooks/use-event-players'
import { useMatchManagement, type MatchManagementState } from '@/hooks/use-match-management'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createTeam, areTeamsEqual, type Team, type Match, type MatchResult, type Score } from '@/utils/queue-management/queue-management'

type Phase = 'setup' | 'preview' | 'active' | 'complete'

function RefetchTimer({ dataUpdatedAt, interval = 5000, className }: { dataUpdatedAt: number, interval?: number, className?: string }) {
  const [seconds, setSeconds] = useState(Math.ceil(interval / 1000))

  useEffect(() => {
    const update = () => {
      if (!dataUpdatedAt) return
      const elapsed = Date.now() - dataUpdatedAt
      const remaining = Math.max(0, interval - elapsed)
      setSeconds(Math.ceil(remaining / 1000))
    }
    update()
    const timer = setInterval(update, 100) // Update frequently for smooth feel if we used progress bar, but 100ms is fine for text too to avoid lag
    return () => clearInterval(timer)
  }, [dataUpdatedAt, interval])

  if (!dataUpdatedAt) return null

  return (
    <div className={`flex items-center text-xs font-mono ${className || ''}`} title="Next update in...">
      <Timer className="h-3 w-3 mr-1" />
      {seconds}s
    </div>
  )
}

export default function EventMatches() {
  const { eventId } = useParams()
  const id = Number(eventId)
  const { isManager } = useAuth()
  
  const { data: event, isLoading: isEventLoading, dataUpdatedAt } = useEvent(id, { refetchInterval: 5000 })
  const { data: eventPlayers, isLoading: isPlayersLoading } = useEventPlayers(id)
  const updateEvent = useUpdateEvent()
  const { data: pastEvents } = useCompletedEvents()
  
  const [phase, setPhase] = useState<Phase>('setup')
  const [numCourts, setNumCourts] = useState(1)
  const [selectedTeams, setSelectedTeams] = useState<Array<{p1: string, p2: string}>>([])
  const [isSetupLoaded, setIsSetupLoaded] = useState(false)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [generateType, setGenerateType] = useState<'MM' | 'MF' | 'FF'>('MM')
  const [fullscreenCourtId, setFullscreenCourtId] = useState<number | null>(null)
  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false)
  const [newTeamP1, setNewTeamP1] = useState('')
  const [newTeamP2, setNewTeamP2] = useState('')
  
  // Match Management Hook
  const {
    queueManager,
    initializeManager,
    saveState,
    isSaving,
    ensurePlayerMapping,
    createPlayerFromProfile,
    recordResult,
    updateScore,
    resetQueue,
    addTeamsToQueue,
    reorderQueue,
    undo,
    redo,
    canUndo,
    canRedo,
    editMatchResult,
    playerMap,
    loadError,
    queueLocked,
    toggleQueueLock
  } = useMatchManagement(event!)

  // Derived state
  const checkedInPlayers = useMemo(() => {
    if (!eventPlayers) return []
    return eventPlayers
      .filter(ep => ep.checked_in_at)
      .sort((a, b) => new Date(a.checked_in_at!).getTime() - new Date(b.checked_in_at!).getTime())
      .map(ep => ep.player!)
      .filter(Boolean)
  }, [eventPlayers])

  // Players currently in use (on court or in queue) - for Add Team dialog filtering
  const playersInUse = useMemo(() => {
    if (phase !== 'active') return new Set<string>()
    
    const usedIds = new Set<string>()
    
    // Create reverse map: numeric id -> profile uuid
    const reverseMap = new Map<number, string>()
    Object.entries(playerMap).forEach(([uuid, numId]) => {
      reverseMap.set(numId, uuid)
    })
    
    // Add players from courts
    queueManager.getCourts().forEach(court => {
      if (court.currentMatch) {
        const match = court.currentMatch
        const p1Id = reverseMap.get(match.team1.player1.id)
        const p2Id = reverseMap.get(match.team1.player2.id)
        const p3Id = reverseMap.get(match.team2.player1.id)
        const p4Id = reverseMap.get(match.team2.player2.id)
        if (p1Id) usedIds.add(p1Id)
        if (p2Id) usedIds.add(p2Id)
        if (p3Id) usedIds.add(p3Id)
        if (p4Id) usedIds.add(p4Id)
      }
    })
    
    // Add players from queue
    queueManager.getCurrentState().queue.forEach(team => {
      const p1Id = reverseMap.get(team.player1.id)
      const p2Id = reverseMap.get(team.player2.id)
      if (p1Id) usedIds.add(p1Id)
      if (p2Id) usedIds.add(p2Id)
    })
    
    return usedIds
  }, [phase, playerMap, queueManager])

  // Effect to sync phase with event state
  useEffect(() => {
    if (event?.status === 'completed' || event?.status === 'canceled') {
      setPhase('complete')
    } else if (event?.matches_state) {
      setPhase('active')
    } else {
      setPhase('setup')
    }
  }, [event?.matches_state, event?.status])

  // Load setup state from localStorage on mount
  useEffect(() => {
    if (!id || phase !== 'setup' || isSetupLoaded) return
    
    try {
      const saved = localStorage.getItem(`event-setup-${id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.numCourts) setNumCourts(parsed.numCourts)
        if (Array.isArray(parsed.selectedTeams)) setSelectedTeams(parsed.selectedTeams)
      }
    } catch (e) {
      console.error('Failed to load setup state from localStorage', e)
    }
    setIsSetupLoaded(true)
  }, [id, phase, isSetupLoaded])

  // Save setup state to localStorage whenever it changes
  useEffect(() => {
    if (!id || phase !== 'setup' || !isSetupLoaded) return
    
    try {
      localStorage.setItem(`event-setup-${id}`, JSON.stringify({
        numCourts,
        selectedTeams
      }))
    } catch (e) {
      console.error('Failed to save setup state to localStorage', e)
    }
  }, [id, phase, numCourts, selectedTeams, isSetupLoaded])

  // Handle Escape key for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFullscreenCourtId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Setup Phase Handlers
  const handleAddTeam = () => {
    setSelectedTeams([...selectedTeams, { p1: '', p2: '' }])
  }

  const handleTeamChange = (index: number, field: 'p1' | 'p2', value: string) => {
    const newTeams = [...selectedTeams]
    newTeams[index] = { ...newTeams[index], [field]: value }
    setSelectedTeams(newTeams)
  }

  const handleRemoveTeam = (index: number) => {
    const newTeams = [...selectedTeams]
    newTeams.splice(index, 1)
    setSelectedTeams(newTeams)
  }

  const handleMoveTeam = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= selectedTeams.length) return
    
    const newTeams = [...selectedTeams]
    const [movedTeam] = newTeams.splice(index, 1)
    newTeams.splice(newIndex, 0, movedTeam)
    setSelectedTeams(newTeams)
  }

  const handleGenerateTeams = () => {
    // 1. Identify available players
    const assignedPlayerIds = new Set<string>()
    selectedTeams.forEach(t => {
      if (t.p1) assignedPlayerIds.add(t.p1)
      if (t.p2) assignedPlayerIds.add(t.p2)
    })

    const availablePlayers = checkedInPlayers.filter(p => !assignedPlayerIds.has(p.id))

    // 2. Filter by gender based on generateType
    let candidates: typeof checkedInPlayers = []
    let pool1: typeof checkedInPlayers = []
    let pool2: typeof checkedInPlayers = []

    const males = availablePlayers.filter(p => p.sex === 'M')
    const females = availablePlayers.filter(p => p.sex === 'F')

    if (generateType === 'MM') {
      candidates = males
    } else if (generateType === 'FF') {
      candidates = females
    } else { // MF
      pool1 = males
      pool2 = females
    }

    // 3. Build past pairs frequency map
    const pairFrequency = new Map<string, number>()
    
    if (pastEvents) {
      pastEvents.forEach(event => {
        const state = event.matches_state as unknown as MatchManagementState
        if (state?.playerMap && state?.queueState) {
          // Create reverse map: number -> uuid
          const reverseMap = new Map<number, string>()
          Object.entries(state.playerMap).forEach(([uuid, id]) => {
            reverseMap.set(id, uuid)
          })

          try {
             const parsedState = JSON.parse(state.queueState)
             if (parsedState.state?.matchHistory) {
                parsedState.state.matchHistory.forEach((match: any) => {
                   // Helper to increment pair count
                   const countPair = (p1Id: number, p2Id: number) => {
                     const uuid1 = reverseMap.get(p1Id)
                     const uuid2 = reverseMap.get(p2Id)
                     
                     if (uuid1 && uuid2) {
                       const key = [uuid1, uuid2].sort().join('|')
                       pairFrequency.set(key, (pairFrequency.get(key) || 0) + 1)
                     }
                   }
                   
                   // Count winner pair
                   if (match.winner) countPair(match.winner.player1.id, match.winner.player2.id)
                   // Count loser pair
                   if (match.loser) countPair(match.loser.player1.id, match.loser.player2.id)
                })
             }
          } catch (e) {
             console.error('Failed to parse past event state', e)
          }
        }
      })
    }

    const newTeams: Array<{p1: string, p2: string}> = []
    
    if (generateType === 'MF') {
      // Mixed doubles logic
      // Shuffle pools
      pool1 = pool1.sort(() => Math.random() - 0.5)
      pool2 = pool2.sort(() => Math.random() - 0.5)
      
      while (pool1.length > 0 && pool2.length > 0) {
        const p1 = pool1[0]
        let bestP2Index = -1
        let minFreq = Infinity
        
        // Find best partner from pool2
        for (let i = 0; i < pool2.length; i++) {
          const p2 = pool2[i]
          const key = [p1.id, p2.id].sort().join('|')
          const freq = pairFrequency.get(key) || 0
          
          if (freq < minFreq) {
            minFreq = freq
            bestP2Index = i
          }
        }
        
        if (bestP2Index !== -1) {
          const p2 = pool2[bestP2Index]
          newTeams.push({ p1: p1.id, p2: p2.id })
          pool1.shift()
          pool2.splice(bestP2Index, 1)
        } else {
            break // Should not happen if lengths > 0
        }
      }
      
      if (pool1.length > 0 || pool2.length > 0) {
          toast.info(`Generated ${newTeams.length} teams. Left over: ${pool1.length} Male(s), ${pool2.length} Female(s).`)
      } else {
          toast.success(`Generated ${newTeams.length} teams!`)
      }

    } else {
      // Same sex logic (MM or FF)
      candidates = candidates.sort(() => Math.random() - 0.5)
      
      while (candidates.length >= 2) {
        const p1 = candidates[0]
        let bestP2Index = -1
        let minFreq = Infinity
        
        // Find best partner from remaining candidates
        for (let i = 1; i < candidates.length; i++) {
          const p2 = candidates[i]
          const key = [p1.id, p2.id].sort().join('|')
          const freq = pairFrequency.get(key) || 0
          
          if (freq < minFreq) {
            minFreq = freq
            bestP2Index = i
          }
        }
        
        if (bestP2Index !== -1) {
          const p2 = candidates[bestP2Index]
          newTeams.push({ p1: p1.id, p2: p2.id })
          candidates.shift() // Remove p1
          candidates.splice(bestP2Index - 1, 1) // Remove p2 (adjust index because p1 was removed)
        } else {
            break
        }
      }

      if (candidates.length > 0) {
          toast.info(`Generated ${newTeams.length} teams. ${candidates.length} player(s) left over.`)
      } else {
          toast.success(`Generated ${newTeams.length} teams!`)
      }
    }
    
    // Sort new teams by check-in time (earliest first)
    // A team's time is the LATEST of its members (when the team is complete)
    const getCheckInTime = (pid: string) => {
      const ep = eventPlayers?.find(ep => ep.player_id === pid)
      return ep?.checked_in_at ? new Date(ep.checked_in_at).getTime() : Date.now()
    }
    
    const sortedNewTeams = [...newTeams].sort((a, b) => {
      const t1 = Math.max(getCheckInTime(a.p1), getCheckInTime(a.p2))
      const t2 = Math.max(getCheckInTime(b.p1), getCheckInTime(b.p2))
      return t1 - t2
    })
    
    setSelectedTeams([...selectedTeams, ...sortedNewTeams])
    setIsGenerateOpen(false)
  }

  const handlePreview = () => {
    // Validation
    const requiredTeams = numCourts * 2
    if (selectedTeams.length < requiredTeams) {
      toast.error(`Need at least ${requiredTeams} teams for ${numCourts} courts`)
      return
    }

    const usedPlayers = new Set<string>()
    for (const team of selectedTeams) {
      if (!team.p1 || !team.p2) {
        toast.error('All teams must have 2 players')
        return
      }
      if (team.p1 === team.p2) {
        toast.error('A player cannot be in a team with themselves')
        return
      }
      if (usedPlayers.has(team.p1) || usedPlayers.has(team.p2)) {
        toast.error('Players cannot be in multiple teams')
        return
      }
      usedPlayers.add(team.p1)
      usedPlayers.add(team.p2)
    }

    // Initialize Manager locally for preview
    // Use selectedTeams directly to preserve user's manual ordering
    const manager = initializeManager(numCourts)
    
    // Create mapping and teams
    const playersToMap = checkedInPlayers.filter(p => usedPlayers.has(p.id))
    const newMap = ensurePlayerMapping(playersToMap)
    
    const teams: Team[] = selectedTeams.map(t => {
      const p1Profile = checkedInPlayers.find(p => p.id === t.p1)!
      const p2Profile = checkedInPlayers.find(p => p.id === t.p2)!
      
      const p1 = createPlayerFromProfile(p1Profile, newMap[p1Profile.id])
      const p2 = createPlayerFromProfile(p2Profile, newMap[p2Profile.id])
      
      return createTeam(p1, p2)
    })

    try {
      manager.initialize(teams)
      setPhase('preview')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to initialize queue')
    }
  }

  const handleCompleteEvent = async () => {
    if (confirm('Are you sure you want to complete this event? This will finalize all matches.')) {
      try {
        await updateEvent.mutateAsync({ id, status: 'completed' })
        toast.success('Event completed!')
      } catch (error) {
        toast.error('Failed to complete event')
      }
    }
  }

  const handleConfirmStart = async () => {
    try {
      await saveState(queueManager, playerMap)
      // Clear setup state from localStorage after successful start
      localStorage.removeItem(`event-setup-${id}`)
      toast.success('Queue started!')
    } catch (error) {
      // Error handled in hook
    }
  }

  // Active Phase Handlers
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean,
    courtId: number,
    match: Match,
    s1: number,
    s2: number
  } | null>(null)

  // Edit Match Dialog State
  const [editDialog, setEditDialog] = useState<{
    isOpen: boolean,
    matchIndex: number,
    result: MatchResult,
    score1: number,
    score2: number
  } | null>(null)

  const handleSubmitScore = (courtId: number, match: Match) => {
    const s1 = match.currentScores?.team1 || 0
    const s2 = match.currentScores?.team2 || 0

    if (s1 === s2) {
      toast.error('Scores cannot be equal')
      return
    }

    setConfirmDialog({
      isOpen: true,
      courtId,
      match,
      s1,
      s2
    })
  }

  const handleConfirmScore = async () => {
    if (!confirmDialog) return

    const { courtId, match, s1, s2 } = confirmDialog
    const scoreMap = {
      [s1]: match.team1,
      [s2]: match.team2
    }

    try {
      await recordResult(courtId, scoreMap)
      setConfirmDialog(null)
      toast.success('Match recorded')
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleAddTeamToQueue = async () => {
    if (!newTeamP1 || !newTeamP2) {
      toast.error('Please select both players')
      return
    }
    if (newTeamP1 === newTeamP2) {
      toast.error('A player cannot be in a team with themselves')
      return
    }

    const p1Profile = checkedInPlayers.find(p => p.id === newTeamP1)
    const p2Profile = checkedInPlayers.find(p => p.id === newTeamP2)

    if (!p1Profile || !p2Profile) {
      toast.error('Player not found')
      return
    }

    try {
      await addTeamsToQueue([{ p1: p1Profile, p2: p2Profile }])
      setIsAddTeamOpen(false)
      setNewTeamP1('')
      setNewTeamP2('')
    } catch (error) {
      // Error handled in hook
    }
  }

  const handleReorderQueue = async (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
    try {
      await reorderQueue(fromIndex, toIndex)
    } catch (error) {
      // Error handled in hook
    }
  }

  if (isEventLoading || isPlayersLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  if (!event) return <div className="container mx-auto p-4">Event not found</div>

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
          <Link to={`/events/${id}`}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Event
          </Link>
        </Button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Match Management</h1>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Trophy className="h-4 w-4" /> {event.event_name}
            </p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Queue data corrupted: </strong>
          <span className="block sm:inline">{loadError}</span>
          <div className="mt-2">
            <Button variant="destructive" size="sm" onClick={resetQueue}>Reset Queue</Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {phase === 'active' && !loadError && isManager && (
        <div className="mb-6 flex justify-end gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={undo}
            disabled={!canUndo || isSaving}
            title="Undo last action"
          >
            <Undo2 className="h-4 w-4 mr-1" /> Undo
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={redo}
            disabled={!canRedo || isSaving}
            title="Redo last undone action"
          >
            <Redo2 className="h-4 w-4 mr-1" /> Redo
          </Button>
          <Button variant="outline" size="sm" onClick={handleCompleteEvent}>
            Complete Event
          </Button>
          <Button variant="destructive" size="sm" onClick={() => {
            if (confirm('Are you sure you want to reset the queue? All history will be lost.')) {
              resetQueue()
            }
          }}>Reset Queue</Button>
        </div>
      )}

      {phase === 'setup' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {!isManager ? (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <PlayCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Waiting for Start</h2>
                <p className="text-muted-foreground">The event manager hasn't started the matches yet.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <label className="block text-sm font-medium mb-2">Number of Courts</label>
                  <Select 
                    value={numCourts.toString()}
                    onValueChange={(v) => setNumCourts(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select courts" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Teams</CardTitle>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsGenerateOpen(true)} variant="outline" size="sm" className="gap-2">
                      <Wand2 className="h-4 w-4" /> Suggest Teams
                    </Button>
                    <Button onClick={handleAddTeam} variant="outline" size="sm">+ Add Team</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedTeams.map((team, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-muted/30 p-3 rounded-lg border">
                      {/* Reorder controls - mobile friendly with 44px touch targets */}
                      <div className="flex flex-col gap-0.5">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-11 w-11 touch-manipulation"
                          onClick={() => handleMoveTeam(idx, 'up')}
                          disabled={idx === 0}
                          aria-label="Move team up"
                        >
                          <ChevronUp className="h-5 w-5" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-11 w-11 touch-manipulation"
                          onClick={() => handleMoveTeam(idx, 'down')}
                          disabled={idx === selectedTeams.length - 1}
                          aria-label="Move team down"
                        >
                          <ChevronDown className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-mono text-muted-foreground text-sm">Team {idx + 1}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Select 
                            value={team.p1}
                            onValueChange={(v) => handleTeamChange(idx, 'p1', v)}
                          >
                            <SelectTrigger className="min-h-11">
                              <SelectValue placeholder="Player 1" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {checkedInPlayers.map(p => (
                                <SelectItem 
                                  key={`p1-${idx}-${p.id}`} 
                                  value={p.id} 
                                  disabled={team.p2 === p.id || selectedTeams.some((t, i) => i !== idx && (t.p1 === p.id || t.p2 === p.id))}
                                >
                                  {p.surname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select 
                            value={team.p2}
                            onValueChange={(v) => handleTeamChange(idx, 'p2', v)}
                          >
                            <SelectTrigger className="min-h-11">
                              <SelectValue placeholder="Player 2" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {checkedInPlayers.map(p => (
                                <SelectItem 
                                  key={`p2-${idx}-${p.id}`} 
                                  value={p.id} 
                                  disabled={team.p1 === p.id || selectedTeams.some((t, i) => i !== idx && (t.p1 === p.id || t.p2 === p.id))}
                                >
                                  {p.surname}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveTeam(idx)} 
                        className="h-11 w-11 text-destructive hover:text-destructive hover:bg-destructive/10 touch-manipulation shrink-0"
                        aria-label="Remove team"
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  ))}
                  
                  {selectedTeams.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No teams added yet</p>
                  )}
                </CardContent>
              </Card>

              <Button 
                className="w-full py-6 text-lg" 
                onClick={handlePreview}
                disabled={selectedTeams.length < numCourts * 2}
              >
                Preview Queue
              </Button>
            </>
          )}
        </div>
      )}

      {phase === 'preview' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Initial Assignments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {queueManager.getCourts().map(court => (
                  <div key={court.id} className="border border-primary/20 p-4 rounded-lg bg-primary/5">
                    <h3 className="font-bold text-primary mb-2">Court {court.id}</h3>
                    {court.currentMatch ? (
                      <div className="text-center">
                        <div className="font-medium">{court.currentMatch.team1.player1.name} & {court.currentMatch.team1.player2.name}</div>
                        <div className="text-xs text-muted-foreground my-1">VS</div>
                        <div className="font-medium">{court.currentMatch.team2.player1.name} & {court.currentMatch.team2.player2.name}</div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic">Empty</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Queue Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-sm overflow-auto whitespace-pre-wrap font-mono">
                {queueManager.beautifyQueue()}
              </pre>
            </CardContent>
          </Card>

          {isManager && (
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1" onClick={() => setPhase('setup')}>Back to Setup</Button>
              <Button className="flex-1" onClick={handleConfirmStart} disabled={isSaving}>
                {isSaving ? 'Starting...' : 'Confirm & Start Queue'}
              </Button>
            </div>
          )}
        </div>
      )}

      {phase === 'active' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Courts & Queue */}
          <div className="lg:col-span-2 space-y-6">
            {/* Courts */}
            <div className={`grid gap-6 ${queueManager.getCourts().length === 1 ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
              {queueManager.getCourts().map(court => {
                const match = court.currentMatch
                if (!match) return null
                
                return (
                  <Card key={court.id} className="overflow-hidden border-primary/20 relative">
                    {isSaving && (
                      <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )}
                    
                    <div className="bg-primary px-4 py-3 flex justify-between items-center">
                      <h3 className="font-bold text-primary-foreground">Court {court.id}</h3>
                      <div className="flex items-center gap-2">
                        <RefetchTimer dataUpdatedAt={dataUpdatedAt} className="text-primary-foreground/80 mr-2" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
                          onClick={() => setFullscreenCourtId(court.id)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 border-none">
                          Match #{match.matchNumber}
                        </Badge>
                      </div>
                    </div>
                    
                    <CardContent className={`p-4 ${queueManager.getCourts().length === 1 ? 'md:p-8' : ''}`}>
                      <div className={`flex items-center justify-between gap-2 mb-4 ${queueManager.getCourts().length === 1 ? 'md:mb-8' : ''}`}>
                        <div className="flex-1 text-center">
                          <div className={`font-bold leading-tight text-foreground ${queueManager.getCourts().length === 1 ? 'text-lg md:text-3xl' : 'text-lg'}`}>{match.team1.player1.name}</div>
                          <div className={`font-bold leading-tight text-foreground ${queueManager.getCourts().length === 1 ? 'text-lg md:text-3xl' : 'text-lg'}`}>{match.team1.player2.name}</div>
                        </div>
                        <div className={`text-muted-foreground font-bold ${queueManager.getCourts().length === 1 ? 'md:text-2xl' : ''}`}>VS</div>
                        <div className="flex-1 text-center">
                          <div className={`font-bold leading-tight text-foreground ${queueManager.getCourts().length === 1 ? 'text-lg md:text-3xl' : 'text-lg'}`}>{match.team2.player1.name}</div>
                          <div className={`font-bold leading-tight text-foreground ${queueManager.getCourts().length === 1 ? 'text-lg md:text-3xl' : 'text-lg'}`}>{match.team2.player2.name}</div>
                        </div>
                      </div>

                      <div className="flex gap-4 items-center justify-center py-4">
                        <div className="flex-1 flex flex-col items-center gap-4">
                          <div className={`font-bold text-primary tabular-nums ${queueManager.getCourts().length === 1 ? 'text-8xl' : 'text-6xl'}`}>
                            {match.currentScores?.team1 || 0}
                          </div>
                          {isManager && (
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-12 w-12 rounded-full border-2"
                                onClick={() => updateScore(court.id, 1, -1)}
                                disabled={!match.currentScores?.team1 || isSaving}
                              >
                                <Minus className="h-6 w-6" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-12 w-12 rounded-full border-2 bg-primary/5 hover:bg-primary/10"
                                onClick={() => updateScore(court.id, 1, 1)}
                                disabled={isSaving}
                              >
                                <Plus className="h-6 w-6" />
                              </Button>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 flex flex-col items-center gap-4">
                          <div className={`font-bold text-primary tabular-nums ${queueManager.getCourts().length === 1 ? 'text-8xl' : 'text-6xl'}`}>
                            {match.currentScores?.team2 || 0}
                          </div>
                          {isManager && (
                            <div className="flex gap-3">
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-12 w-12 rounded-full border-2"
                                onClick={() => updateScore(court.id, 2, -1)}
                                disabled={!match.currentScores?.team2 || isSaving}
                              >
                                <Minus className="h-6 w-6" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-12 w-12 rounded-full border-2 bg-primary/5 hover:bg-primary/10"
                                onClick={() => updateScore(court.id, 2, 1)}
                                disabled={isSaving}
                              >
                                <Plus className="h-6 w-6" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {isManager && (
                        <Button 
                          className={`w-full mt-4 ${queueManager.getCourts().length === 1 ? 'h-12 md:h-16 md:text-xl md:mt-8' : 'h-11'}`}
                          onClick={() => handleSubmitScore(court.id, match)}
                          disabled={isSaving}
                        >
                          Record Result
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Queue */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Queue
                  {queueLocked && <Lock className="h-4 w-4 text-muted-foreground" />}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{queueManager.getCurrentState().queue.length} waiting</Badge>
                  {isManager && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={isSaving}>
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={toggleQueueLock}>
                          {queueLocked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
                          {queueLocked ? 'Unlock Reordering' : 'Lock Reordering'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsAddTeamOpen(true)}>
                          <UserPlus className="h-4 w-4 mr-2" /> Add Team
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {queueManager.getCurrentState().queue.length === 0 ? (
                  <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground text-center border">
                    Queue is empty
                  </div>
                ) : (
                  <div className="space-y-2">
                    {queueManager.getCurrentState().queue.map((team, idx) => (
                      <div 
                        key={`${team.player1.id}-${team.player2.id}`} 
                        className="flex items-center gap-2 bg-muted/30 p-3 rounded-lg border"
                      >
                        {isManager && !queueLocked && (
                          <div className="flex flex-col gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 touch-manipulation"
                              onClick={() => handleReorderQueue(idx, 'up')}
                              disabled={idx === 0 || isSaving}
                              aria-label="Move team up in queue"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 touch-manipulation"
                              onClick={() => handleReorderQueue(idx, 'down')}
                              disabled={idx === queueManager.getCurrentState().queue.length - 1 || isSaving}
                              aria-label="Move team down in queue"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs text-muted-foreground mr-2">#{idx + 1}</span>
                          <span className="font-medium">{team.player1.name} e {team.player2.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Stats & History */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" /> Standings
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50%]">Team</TableHead>
                      <TableHead className="text-center">W</TableHead>
                      <TableHead className="text-center">L</TableHead>
                      <TableHead className="text-center">Pts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueManager.getTeamStatistics().map((stat, i) => (
                      <TableRow key={i} className={i === 0 && queueManager.getMatchHistory().length > 0 ? 'bg-yellow-50/50' : ''}>
                        <TableCell className="font-medium">
                          {i === 0 && queueManager.getMatchHistory().length > 0 && <Crown className="h-4 w-4 text-yellow-500 inline mr-1" />}
                          {stat.team.player1.name} & {stat.team.player2.name}
                        </TableCell>
                        <TableCell className="text-center font-bold text-green-600">{stat.wins}</TableCell>
                        <TableCell className="text-center text-destructive">{stat.losses}</TableCell>
                        <TableCell className="text-center font-bold">{stat.totalPoints}</TableCell>
                      </TableRow>
                    ))}
                    {queueManager.getTeamStatistics().length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No matches played yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Match History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" /> Match History
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-60 overflow-y-auto">
                  {queueManager.getMatchHistory().slice().reverse().map((result, i) => {
                    const actualIndex = queueManager.getMatchHistory().length - 1 - i
                    return (
                    <div key={i} className="text-sm border-b p-3 last:border-0 hover:bg-muted/20">
                      <div className="flex justify-between text-muted-foreground text-xs mb-1">
                        <span>Match #{result.match.matchNumber} • Court {result.courtId}</span>
                        <div className="flex items-center gap-2">
                          <span>{result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isManager && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                // Find scores for team1 and team2 by matching teams
                                const team1Score = result.scores?.find(s => areTeamsEqual(s.team, result.match.team1))?.score || 0
                                const team2Score = result.scores?.find(s => areTeamsEqual(s.team, result.match.team2))?.score || 0
                                setEditDialog({
                                  isOpen: true,
                                  matchIndex: actualIndex,
                                  result,
                                  score1: team1Score,
                                  score2: team2Score
                                })
                              }}
                              disabled={isSaving}
                              title="Edit match scores"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 text-right">
                          <div className="font-medium text-green-600 leading-tight">{result.winner.player1.name}</div>
                          <div className="font-medium text-green-600 leading-tight">{result.winner.player2.name}</div>
                        </div>
                        
                        {result.scores ? (
                          <Badge className="font-bold whitespace-nowrap px-2 bg-yellow-50/50 border-yellow-200">
                            <span className="text-green-600">{result.scores[0].score}</span>
                            <span className="text-muted-foreground mx-1">-</span>
                            <span className="text-destructive">{result.scores[1].score}</span>
                          </Badge>
                        ) : (
                          <span className="font-bold text-muted-foreground mx-2">vs</span>
                        )}

                        <div className="flex-1 text-left">
                          <div className="text-muted-foreground leading-tight">{result.loser.player1.name}</div>
                          <div className="text-muted-foreground leading-tight">{result.loser.player2.name}</div>
                        </div>
                      </div>
                    </div>
                  )})}
                  {queueManager.getMatchHistory().length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No matches recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {phase === 'complete' && (
        <div className="space-y-6 max-w-4xl mx-auto">
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              {event?.status === 'canceled' ? (
                <>
                  <X className="h-12 w-12 text-destructive mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">Event Canceled</h2>
                  <p className="text-muted-foreground">This event has been canceled.</p>
                </>
              ) : (
                <>
                  <Trophy className="h-12 w-12 text-primary mb-4" />
                  <h2 className="text-2xl font-bold text-foreground mb-2">Event Completed</h2>
                  <p className="text-muted-foreground">Final Standings and Match Results</p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Final Standings</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">W</TableHead>
                    <TableHead className="text-center">L</TableHead>
                    <TableHead className="text-center">Pts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queueManager.getTeamStatistics().map((stat, i) => (
                    <TableRow key={i} className={i === 0 && queueManager.getMatchHistory().length > 0 ? 'bg-yellow-50/50' : ''}>
                      <TableCell className="font-medium">
                        {i === 0 && queueManager.getMatchHistory().length > 0 && <Crown className="h-4 w-4 text-yellow-500 inline mr-1" />}
                        {stat.team.player1.name} & {stat.team.player2.name}
                      </TableCell>
                      <TableCell className="text-center font-bold text-green-600">{stat.wins}</TableCell>
                      <TableCell className="text-center text-destructive">{stat.losses}</TableCell>
                      <TableCell className="text-center font-bold">{stat.totalPoints}</TableCell>
                    </TableRow>
                  ))}
                  {queueManager.getTeamStatistics().length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No matches played</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Match History */}
          <Card>
            <CardHeader>
              <CardTitle>Match History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {queueManager.getMatchHistory().slice().reverse().map((result, i) => (
                  <div key={i} className="text-sm border-b p-3 last:border-0 hover:bg-muted/20">
                    <div className="flex justify-between text-muted-foreground text-xs mb-1">
                      <span>Match #{result.match.matchNumber} • Court {result.courtId}</span>
                      <span>{result.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 text-right">
                        <div className="font-medium text-green-600 leading-tight">{result.winner.player1.name}</div>
                        <div className="font-medium text-green-600 leading-tight">{result.winner.player2.name}</div>
                      </div>
                      
                      {result.scores ? (
                        <Badge className="font-bold whitespace-nowrap px-2 bg-yellow-50/50 border-yellow-200">
                          <span className="text-green-600">{result.scores[0].score}</span>
                          <span className="text-muted-foreground mx-1">-</span>
                          <span className="text-destructive">{result.scores[1].score}</span>
                        </Badge>
                      ) : (
                        <span className="font-bold text-muted-foreground mx-2">vs</span>
                      )}

                      <div className="flex-1 text-left">
                        <div className="text-muted-foreground leading-tight">{result.loser.player1.name}</div>
                        <div className="text-muted-foreground leading-tight">{result.loser.player2.name}</div>
                      </div>
                    </div>
                  </div>
                ))}
                {queueManager.getMatchHistory().length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No matches recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fullscreen Score Overlay */}
      {fullscreenCourtId && (() => {
        const court = queueManager.getCourts().find(c => c.id === fullscreenCourtId)
        const match = court?.currentMatch
        
        if (!court || !match) return null

        return (
          <div className="fixed inset-0 z-50 bg-background flex items-center justify-center overflow-hidden">
            <div 
              className="w-[100vh] h-[100vw] flex flex-col bg-background p-4"
              style={{ transform: 'rotate(90deg)' }}
            >
              {/* Header */}
              <div className="relative flex justify-center items-center mb-2 w-full">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-base py-1 px-2">Court {court.id}</Badge>
                  <Badge variant="secondary" className="text-base py-1 px-2">Match #{match.matchNumber}</Badge>
                  <RefetchTimer dataUpdatedAt={dataUpdatedAt} className="text-muted-foreground ml-2" />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-0"
                  onClick={() => setFullscreenCourtId(null)}
                >
                  <Minimize2 className="h-6 w-6" />
                </Button>
              </div>

              {/* Score Board */}
              <div className="flex-1 flex items-center justify-around gap-2">
                {/* Team 1 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="text-center h-16 flex flex-col justify-center">
                    <div className="text-xl font-bold leading-tight truncate max-w-[35vh]">{match.team1.player1.name}</div>
                    <div className="text-xl font-bold leading-tight truncate max-w-[35vh]">{match.team1.player2.name}</div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 w-full">
                    {isManager && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-full border-4 shrink-0"
                        onClick={() => updateScore(court.id, 1, -1)}
                        disabled={!match.currentScores?.team1 || isSaving}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                    )}
                    
                    <div className="text-[10rem] font-bold text-primary leading-none tabular-nums flex-1 text-center">
                      {match.currentScores?.team1 || 0}
                    </div>

                    {isManager && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-full border-4 bg-primary/5 hover:bg-primary/10 shrink-0"
                        onClick={() => updateScore(court.id, 1, 1)}
                        disabled={isSaving}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-xl font-bold text-muted-foreground rotate-90 sm:rotate-0">VS</div>

                {/* Team 2 */}
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                  <div className="text-center h-16 flex flex-col justify-center">
                    <div className="text-xl font-bold leading-tight truncate max-w-[35vh]">{match.team2.player1.name}</div>
                    <div className="text-xl font-bold leading-tight truncate max-w-[35vh]">{match.team2.player2.name}</div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-4 w-full">
                    {isManager && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-full border-4 shrink-0"
                        onClick={() => updateScore(court.id, 2, -1)}
                        disabled={!match.currentScores?.team2 || isSaving}
                      >
                        <Minus className="h-6 w-6" />
                      </Button>
                    )}

                    <div className="text-[10rem] font-bold text-primary leading-none tabular-nums flex-1 text-center">
                      {match.currentScores?.team2 || 0}
                    </div>

                    {isManager && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="h-14 w-14 rounded-full border-4 bg-primary/5 hover:bg-primary/10 shrink-0"
                        onClick={() => updateScore(court.id, 2, 1)}
                        disabled={isSaving}
                      >
                        <Plus className="h-6 w-6" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Match Result</DialogTitle>
            <DialogDescription>
              Please verify the scores before recording.
            </DialogDescription>
          </DialogHeader>
          
          {confirmDialog && (
            <div className="py-4 text-center">
              <div className="text-lg mb-2 flex items-center justify-center gap-2">
                <span className="font-bold">{confirmDialog.match.team1.player1.name} & {confirmDialog.match.team1.player2.name}</span>
                <span className="text-muted-foreground">vs</span>
                <span className="font-bold">{confirmDialog.match.team2.player1.name} & {confirmDialog.match.team2.player2.name}</span>
              </div>
              <div className="text-4xl font-bold text-primary my-4">
                {confirmDialog.s1} - {confirmDialog.s2}
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Winner: <span className="font-bold text-foreground">
                  {confirmDialog.s1 > confirmDialog.s2 
                    ? `${confirmDialog.match.team1.player1.name} & ${confirmDialog.match.team1.player2.name}`
                    : `${confirmDialog.match.team2.player1.name} & ${confirmDialog.match.team2.player2.name}`
                  }
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button onClick={handleConfirmScore} disabled={isSaving}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Teams Dialog */}
      <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suggest Teams</DialogTitle>
            <DialogDescription>
              Auto-generate teams from remaining players based on history.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Label className="mb-2 block">Pairing Type</Label>
            <RadioGroup value={generateType} onValueChange={(v) => setGenerateType(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MM" id="r1" />
                <Label htmlFor="r1">Male / Male</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FF" id="r2" />
                <Label htmlFor="r2">Female / Female</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MF" id="r3" />
                <Label htmlFor="r3">Mixed (Male / Female)</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter className='gap-2'>
            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>Cancel</Button>
            <Button onClick={handleGenerateTeams}>Generate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Team to Queue Dialog */}
      <Dialog open={isAddTeamOpen} onOpenChange={(open) => {
        if (!open) {
          setNewTeamP1('')
          setNewTeamP2('')
        }
        setIsAddTeamOpen(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team to Queue</DialogTitle>
            <DialogDescription>
              Select two players to form a new team and add them to the queue.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div>
              <Label className="mb-2 block">Player 1</Label>
              <Select value={newTeamP1} onValueChange={setNewTeamP1}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select player 1" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {checkedInPlayers
                    .filter(p => !playersInUse.has(p.id) && p.id !== newTeamP2)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.surname}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="mb-2 block">Player 2</Label>
              <Select value={newTeamP2} onValueChange={setNewTeamP2}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Select player 2" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {checkedInPlayers
                    .filter(p => !playersInUse.has(p.id) && p.id !== newTeamP1)
                    .map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.surname}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            {checkedInPlayers.filter(p => !playersInUse.has(p.id)).length < 2 && (
              <p className="text-sm text-muted-foreground text-center">
                Not enough available players. All checked-in players are already in the queue or on court.
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddTeamOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddTeamToQueue} 
              disabled={!newTeamP1 || !newTeamP2 || isSaving}
            >
              {isSaving ? 'Adding...' : 'Add to Queue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Match Result Dialog */}
      <Dialog open={!!editDialog} onOpenChange={(open) => !open && setEditDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Match Result</DialogTitle>
            <DialogDescription>
              Correct the scores for this match. This is a cosmetic change only.
            </DialogDescription>
          </DialogHeader>
          
          {editDialog && (
            <div className="py-4 space-y-4">
              <div className="text-center mb-4">
                <div className="text-sm text-muted-foreground mb-1">Match #{editDialog.result.match.matchNumber}</div>
                <div className="font-medium">
                  {editDialog.result.match.team1.player1.name} & {editDialog.result.match.team1.player2.name}
                  <span className="text-muted-foreground mx-2">vs</span>
                  {editDialog.result.match.team2.player1.name} & {editDialog.result.match.team2.player2.name}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-2 block text-center">
                    {editDialog.result.match.team1.player1.name} & {editDialog.result.match.team1.player2.name}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={editDialog.score1}
                    onChange={(e) => setEditDialog({ ...editDialog, score1: parseInt(e.target.value) || 0 })}
                    className="text-center text-2xl h-14"
                  />
                </div>
                <div>
                  <Label className="mb-2 block text-center">
                    {editDialog.result.match.team2.player1.name} & {editDialog.result.match.team2.player2.name}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={editDialog.score2}
                    onChange={(e) => setEditDialog({ ...editDialog, score2: parseInt(e.target.value) || 0 })}
                    className="text-center text-2xl h-14"
                  />
                </div>
              </div>
              
              {editDialog.score1 === editDialog.score2 && (
                <p className="text-sm text-destructive text-center">Scores cannot be equal</p>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                New Winner: <span className="font-bold text-foreground">
                  {editDialog.score1 > editDialog.score2 
                    ? `${editDialog.result.match.team1.player1.name} & ${editDialog.result.match.team1.player2.name}`
                    : editDialog.score2 > editDialog.score1
                    ? `${editDialog.result.match.team2.player1.name} & ${editDialog.result.match.team2.player2.name}`
                    : 'N/A (tie)'}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditDialog(null)}>Cancel</Button>
            <Button 
              onClick={async () => {
                if (!editDialog) return
                if (editDialog.score1 === editDialog.score2) {
                  toast.error('Scores cannot be equal')
                  return
                }
                
                const team1 = editDialog.result.match.team1
                const team2 = editDialog.result.match.team2
                const newScores: [Score, Score] = [
                  { team: team1, score: editDialog.score1 },
                  { team: team2, score: editDialog.score2 }
                ]
                
                try {
                  await editMatchResult(editDialog.matchIndex, newScores)
                  setEditDialog(null)
                } catch {
                  // Error handled in hook
                }
              }} 
              disabled={isSaving || (editDialog?.score1 === editDialog?.score2)}
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
