import { z } from 'zod'

export const eventSchema = z.object({
  event_name: z.string().min(1, 'Event name is required').max(100, 'Event name is too long'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['scheduled', 'ongoing', 'completed', 'canceled']),
})

export type EventFormData = z.infer<typeof eventSchema>
