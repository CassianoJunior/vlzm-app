import { z } from 'zod'

export const updateOwnProfileSchema = z.object({
  surname: z.string().min(1, 'Name is required'),
  sex: z.enum(['M', 'F'], { message: 'Sex is required' }),
})

export type UpdateOwnProfileFormData = z.infer<typeof updateOwnProfileSchema>
