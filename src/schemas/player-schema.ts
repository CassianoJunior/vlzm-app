import { z } from 'zod'

export const createPlayerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  surname: z.string().min(1, 'Name is required'),
  sex: z.enum(['M', 'F'], { message: 'Sex is required' }),
  role: z.enum(['player', 'manager']),
})

export const updatePlayerSchema = z.object({
  surname: z.string().min(1, 'Name is required'),
  sex: z.enum(['M', 'F'], { message: 'Sex is required' }),
  role: z.enum(['player', 'manager']),
})

export type CreatePlayerFormData = z.infer<typeof createPlayerSchema>
export type UpdatePlayerFormData = z.infer<typeof updatePlayerSchema>
