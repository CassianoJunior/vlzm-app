import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { EventForm } from '@/components/event-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCreateEvent } from '@/hooks/use-events'
import { useAuth } from '@/contexts/auth-context'
import type { EventFormData } from '@/schemas/event-schema'

export default function CreateEvent() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const createEvent = useCreateEvent()

  const handleSubmit = async (data: EventFormData) => {
    if (!user) return

    try {
      await createEvent.mutateAsync({
        ...data,
        created_by: user.id,
      })
      toast.success('Event created successfully')
      navigate('/events')
    } catch (error) {
      console.error('Failed to create event:', error)
      toast.error('Failed to create event')
    }
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
          <CardTitle>Create New Event</CardTitle>
        </CardHeader>
        <CardContent>
          <EventForm onSubmit={handleSubmit} isLoading={createEvent.isPending} />
        </CardContent>
      </Card>
    </div>
  )
}
