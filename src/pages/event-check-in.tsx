import { useParams, Link } from 'react-router-dom'
import { Calendar, CheckCircle2, Circle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useEvent } from '@/hooks/use-events'
import {
  useEventPlayers,
  usePlayerCheckInStatus,
  useCheckIn,
  useCheckOut,
  useManagerCheckIn,
  useManagerCheckOut,
} from '@/hooks/use-event-players'
import { usePlayers } from '@/hooks/use-players'
import { formatDate, formatTime } from '@/lib/utils'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function EventCheckIn() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const eventId = eventIdParam ? parseInt(eventIdParam) : undefined
  const { user, profile, isManager } = useAuth()
  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId)
  const { data: eventPlayers, isLoading: isLoadingPlayers } = useEventPlayers(eventId)
  const { data: allPlayers } = usePlayers()
  const { data: playerStatus } = usePlayerCheckInStatus(eventId, user?.id)
  const checkIn = useCheckIn()
  const checkOut = useCheckOut()
  const managerCheckIn = useManagerCheckIn()
  const managerCheckOut = useManagerCheckOut()
  const [error, setError] = useState<string | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')

  if (isLoadingEvent || isLoadingPlayers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
          <p className="text-destructive">Event not found</p>
        </div>
      </div>
    )
  }

  const handlePlayerCheckIn = async () => {
    if (!user || !eventId) return

    try {
      setError(null)
      await checkIn.mutateAsync({ eventId, playerId: user.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check in')
    }
  }

  const handlePlayerCheckOut = async () => {
    if (!user || !eventId) return

    try {
      setError(null)
      await checkOut.mutateAsync({ eventId, playerId: user.id })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check out')
    }
  }

  const handleManagerToggleCheckIn = async (playerId: string, eventPlayerId: number | null, currentStatus: string | null) => {
    try {
      setError(null)
      if (eventPlayerId) {
        // Update existing record
        await managerCheckIn.mutateAsync({
          eventPlayerId,
          checkedInAt: currentStatus ? null : new Date().toISOString(),
        })
      } else {
        // Create new check-in for player not yet in event_players
        await checkIn.mutateAsync({ eventId: eventId!, playerId })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update check-in')
    }
  }

  const handleManagerToggleCheckOut = async (eventPlayerId: number, currentStatus: string | null) => {
    try {
      setError(null)
      await managerCheckOut.mutateAsync({
        eventPlayerId,
        checkedOutAt: currentStatus ? null : new Date().toISOString(),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update check-out')
    }
  }

  const handleAddPlayer = async () => {
    if (!selectedPlayerId || !eventId) return
    try {
      setError(null)
      await checkIn.mutateAsync({ eventId, playerId: selectedPlayerId })
      setSelectedPlayerId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add player')
    }
  }

  const canPlayerCheckIn = event?.status === 'scheduled'
  const canManagerCheckIn = event?.status === 'ongoing' || event?.status === 'scheduled'
  const isCheckedIn = !!playerStatus?.checked_in_at
  const isCheckedOut = !!playerStatus?.checked_out_at

  // For managers, ensure they appear in the list even if not yet checked in
  const allPlayersForManager = isManager && user && profile ? (() => {
    const managerInList = eventPlayers?.some(ep => ep.player_id === user.id)
    if (!managerInList) {
      // Create a virtual entry for the manager
      const managerEntry = {
        id: 0, // Temporary ID to indicate this is not yet in database
        event_id: eventId!,
        player_id: user.id,
        checked_in_at: null,
        checked_out_at: null,
        checked_in: false,
        player: {
          id: user.id,
          surname: profile.surname,
          role: profile.role,
        }
      }
      return [managerEntry, ...(eventPlayers || [])]
    }
    return eventPlayers || []
  })() : eventPlayers

  const availablePlayers = allPlayers?.filter(p => 
    !eventPlayers?.some(ep => ep.player_id === p.id)
  ) || []

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{event.event_name}</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> {formatDate(event.date)}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Player Self Check-in/Check-out (non-managers only) */}
      {!isManager && canPlayerCheckIn && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Your Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isCheckedIn ? (
              <Button
                onClick={handlePlayerCheckIn}
                disabled={checkIn.isPending}
                className="w-full min-h-11"
                size="lg"
              >
                {checkIn.isPending ? 'Checking in...' : 'Check In'}
              </Button>
            ) : isCheckedOut ? (
              <div className="bg-muted/50 border border-border rounded-md p-4">
                <p className="text-sm text-foreground flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" /> You checked in at {formatTime(playerStatus.checked_in_at!)}
                </p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> You checked out at {formatTime(playerStatus.checked_out_at!)}
                </p>
              </div>
            ) : (
              <>
                <div className="bg-secondary/20 border border-secondary/30 rounded-md p-4">
                  <p className="text-sm text-secondary-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> You checked in at {formatTime(playerStatus.checked_in_at!)}
                  </p>
                </div>
                <Button
                  onClick={handlePlayerCheckOut}
                  disabled={checkOut.isPending}
                  variant="secondary"
                  className="w-full min-h-11"
                  size="lg"
                >
                  {checkOut.isPending ? 'Checking out...' : 'Check Out'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manager Check-in Management (for all players including themselves) */}
      {isManager && canManagerCheckIn && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Manage Check-ins</CardTitle>
              
              <div className="flex gap-2 w-full sm:w-auto">
                <Select
                  value={selectedPlayerId}
                  onValueChange={setSelectedPlayerId}
                >
                  <SelectTrigger className="flex-1 sm:w-48">
                    <SelectValue placeholder="Select player..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlayers.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.surname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddPlayer}
                  disabled={!selectedPlayerId || checkIn.isPending}
                >
                  Add
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {!allPlayersForManager || allPlayersForManager.length === 0 ? (
              <p className="text-muted-foreground">No players checked in yet</p>
            ) : (
              <div className="space-y-3">
                {allPlayersForManager.map((ep) => {
                  const isCurrentUser = ep.player_id === user?.id
                  const playerName = ep.player?.surname || 'Unknown Player'
                  
                  return (
                    <div
                      key={ep.id || ep.player_id}
                      className={`rounded-lg p-4 border ${
                        isCurrentUser 
                          ? 'bg-primary/5 border-primary/20' 
                          : 'bg-card border-border'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                          <p className="font-medium text-foreground">
                            {playerName} {isCurrentUser && '(You)'}
                          </p>
                          <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            {ep.checked_in_at ? (
                              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Checked in: {formatTime(ep.checked_in_at)}</p>
                            ) : (
                              <p className="flex items-center gap-2"><Circle className="h-4 w-4 text-muted-foreground" /> Not checked in</p>
                            )}
                            {ep.checked_out_at && (
                              <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Checked out: {formatTime(ep.checked_out_at)}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0">
                          <Button
                            onClick={() => handleManagerToggleCheckIn(ep.player_id, ep.id || null, ep.checked_in_at)}
                            disabled={managerCheckIn.isPending || checkIn.isPending}
                            variant={ep.checked_in_at ? "secondary" : "default"}
                            className="flex-1 sm:flex-initial min-h-11"
                          >
                            {ep.checked_in_at ? 'Undo Check-in' : 'Check In'}
                          </Button>
                          
                          {ep.checked_in_at && (
                            <Button
                              onClick={() => handleManagerToggleCheckOut(ep.id, ep.checked_out_at)}
                              disabled={managerCheckOut.isPending}
                              variant={ep.checked_out_at ? "secondary" : "destructive"}
                              className="flex-1 sm:flex-initial min-h-11"
                            >
                              {ep.checked_out_at ? 'Undo Check-out' : 'Check Out'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* View All Players (for both roles when not in active mode) */}
      {(!isManager || !canManagerCheckIn) && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {!eventPlayers || eventPlayers.length === 0 ? (
              <p className="text-muted-foreground">No players registered yet</p>
            ) : (
              <div className="space-y-3">
                {eventPlayers.map((ep) => (
                  <div
                    key={ep.id}
                    className="bg-muted/30 border border-border rounded-lg p-4"
                  >
                    <p className="font-medium text-foreground">
                      {ep.player?.surname || 'Unknown Player'}
                    </p>
                    <div className="text-sm text-muted-foreground mt-1 space-y-1">
                      {ep.checked_in_at ? (
                        <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /> Checked in: {formatTime(ep.checked_in_at)}</p>
                      ) : (
                        <p className="flex items-center gap-2"><Circle className="h-4 w-4 text-muted-foreground" /> Not checked in</p>
                      )}
                      {ep.checked_out_at && (
                        <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Checked out: {formatTime(ep.checked_out_at)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
