import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, BarChart3, Swords, Plus } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useEvents, useDeleteEvent, useUpdateEvent } from '@/hooks/use-events'
import type { EventStatus } from '@/types/database'
import { formatDate, formatTime } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const statusVariants: Record<EventStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: 'secondary',
  ongoing: 'default',
  completed: 'outline',
  canceled: 'destructive',
}

export default function Events() {
  const { isManager } = useAuth()
  const [page, setPage] = useState(1)
  const perPage = 12
  const { data: paged, isLoading, error } = useEvents(page, perPage)
  const events = paged?.items ?? []
  const total = paged?.total ?? 0
  const deleteEvent = useDeleteEvent()
  const updateEvent = useUpdateEvent()

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await deleteEvent.mutateAsync(id)
    }
  }

  const handleStartEvent = async (id: number) => {
    if (window.confirm('Are you sure you want to start this event?')) {
      await updateEvent.mutateAsync({ id, status: 'ongoing' })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading events...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-destructive">Error loading events</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-foreground">Events</h1>
        {isManager && (
          <Button asChild className="w-full sm:w-auto min-h-11">
            <Link to="/events/create">
              <Plus className="mr-2 h-4 w-4" /> Create Event
            </Link>
          </Button>
        )}
      </div>

      {!events || events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No events found</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => (
              <Card key={event.id} className="flex flex-col h-full">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <CardTitle className="text-lg line-clamp-2">{event.event_name}</CardTitle>
                    <Badge variant={statusVariants[event.status]} className="shrink-0">
                      {event.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 grow">
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {formatDate(event.date)}</p>
                    <p className="flex items-center gap-2"><Clock className="h-4 w-4" /> {formatTime(event.date)}</p>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 mt-auto">
                  <Button asChild className="w-full min-h-11" variant="secondary">
                    <Link to={`/events/${event.id}/check-in`}>
                      Check-ins
                    </Link>
                  </Button>
                  
                  {isManager && event.status === 'scheduled' && (
                    <Button 
                      onClick={() => handleStartEvent(event.id)}
                      className="w-full min-h-11"
                    >
                      Start Event
                    </Button>
                  )}
                  
                  {event.status === 'completed' && (
                    <Button asChild className="w-full min-h-11">
                      <Link to={`/events/${event.id}/matches`}>
                        <BarChart3 className="mr-2 h-4 w-4" /> Results
                      </Link>
                    </Button>
                  )}
                  
                  {event.status === 'ongoing' && (
                    <Button asChild className="w-full min-h-11">
                      <Link to={`/events/${event.id}/matches`}>
                        {isManager ? <><Swords className="mr-2 h-4 w-4" /> Manage Matches</> : <><BarChart3 className="mr-2 h-4 w-4" /> View Matches</>}
                      </Link>
                    </Button>
                  )}
                  
                  {isManager && event.status !== 'completed' && event.status !== 'canceled' && (
                    <div className="flex gap-2 w-full">
                      <Button asChild variant="outline" className="flex-1 min-h-11">
                        <Link to={`/events/${event.id}/edit`}>
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={() => handleDelete(event.id)}
                        className="flex-1 min-h-11"
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-6">
            <Button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="min-h-11"
            >
              Prev
            </Button>
            <div className="text-sm text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / perPage))}
            </div>
            <Button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / perPage)}
              className="min-h-11"
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
