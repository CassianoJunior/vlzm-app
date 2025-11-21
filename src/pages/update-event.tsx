import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEvent, useUpdateEvent } from '@/hooks/use-events'
import { EventForm } from '@/components/event-form'
import type { EventFormData } from '@/schemas/event-schema'

export default function UpdateEvent() {
  const { eventId: id } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const eventId = id ? parseInt(id) : undefined
  const { data: event, isLoading: isLoadingEvent } = useEvent(eventId)
  const updateEvent = useUpdateEvent()

  const handleSubmit = async (data: EventFormData) => {
    if (!eventId) return

    try {
      await updateEvent.mutateAsync({
        id: eventId,
        ...data,
        date: new Date(data.date).toISOString(),
      })
      toast.success('Event updated successfully')
      navigate('/events')
    } catch (error) {
      console.error('Failed to update event:', error)
      toast.error('Failed to update event')
    }
  }

  if (isLoadingEvent) {
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

  if (event.status === 'completed' || event.status === 'canceled') {
    return (
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Button variant="ghost" asChild className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
          <Link to="/events">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
          </Link>
        </Button>
        
        <Card>
          <CardHeader>
            <CardTitle>Update Event</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-md text-center">
              <p className="text-muted-foreground">
                This event is {event.status} and cannot be updated.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <Button variant="ghost" asChild className="mb-6 pl-0 hover:bg-transparent hover:text-primary">
        <Link to="/events">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Events
        </Link>
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>Update Event</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm 
            event={event} 
            onSubmit={handleSubmit} 
            isLoading={updateEvent.isPending} 
          />
        </CardContent>
      </Card>
    </div>
  )
}
