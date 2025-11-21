import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { eventSchema, type EventFormData } from '@/schemas/event-schema'
import type { Event } from '@/types/database'
import { toLocalISOString } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface EventFormProps {
  event?: Event
  onSubmit: (data: EventFormData) => Promise<void>
  isLoading?: boolean
}

export  function EventForm({ event, onSubmit, isLoading }: EventFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: event
      ? {
          event_name: event.event_name,
          date: toLocalISOString(event.date), // Format for datetime-local with timezone adjustment
          status: event.status,
        }
      : {
          event_name: '',
          date: '',
          status: 'scheduled' as const,
        },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="event_name">Event Name *</Label>
        <Input
          {...register('event_name')}
          id="event_name"
          type="text"
          placeholder="Enter event name"
          className="min-h-11"
        />
        {errors.event_name && (
          <p className="text-sm text-destructive">{errors.event_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date and Time *</Label>
        <Input
          {...register('date')}
          id="date"
          type="datetime-local"
          className="min-h-11"
        />
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
      </div>

      {event && (
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            onValueChange={(value) => setValue('status', value as any)}
            defaultValue={watch('status')}
          >
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
          {errors.status && (
            <p className="text-sm text-destructive">{errors.status.message}</p>
          )}
        </div>
      )}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-11"
      >
        {isLoading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
      </Button>
    </form>
  )
}
