import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { 
  createPlayerSchema, 
  updatePlayerSchema, 
  type CreatePlayerFormData, 
  type UpdatePlayerFormData 
} from '@/schemas/player-schema'
import type { Profile } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CreatePlayerFormProps {
  onSubmit: (data: CreatePlayerFormData) => Promise<void>
  isLoading?: boolean
}

interface EditPlayerFormProps {
  player: Profile
  onSubmit: (data: UpdatePlayerFormData) => Promise<void>
  isLoading?: boolean
}

export function CreatePlayerForm({ onSubmit, isLoading }: CreatePlayerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePlayerFormData>({
    resolver: zodResolver(createPlayerSchema),
    defaultValues: {
      email: '',
      password: '',
      surname: '',
      sex: 'M' as const,
      role: 'player' as const,
    },
  })

  const currentSex = watch('sex')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          {...register('email')}
          id="email"
          type="email"
          placeholder="Enter email address"
          autoComplete="email"
          className="min-h-11"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <Input
          {...register('password')}
          id="password"
          type="password"
          placeholder="Create a password"
          autoComplete="new-password"
          className="min-h-11"
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="surname">Name *</Label>
        <Input
          {...register('surname')}
          id="surname"
          type="text"
          placeholder="Enter player name"
          className="min-h-11"
        />
        {errors.surname && (
          <p className="text-sm text-destructive">{errors.surname.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Sex *</Label>
        <RadioGroup
          value={currentSex}
          onValueChange={(value) => setValue('sex', value as 'M' | 'F')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="M" id="create-sex-m" className="min-h-6 min-w-6" />
            <Label htmlFor="create-sex-m" className="cursor-pointer">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="F" id="create-sex-f" className="min-h-6 min-w-6" />
            <Label htmlFor="create-sex-f" className="cursor-pointer">Female</Label>
          </div>
        </RadioGroup>
        {errors.sex && (
          <p className="text-sm text-destructive">{errors.sex.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          onValueChange={(value) => setValue('role', value as 'player' | 'manager')}
          defaultValue={watch('role')}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-11"
      >
        {isLoading ? 'Creating...' : 'Create Player'}
      </Button>
    </form>
  )
}

export function EditPlayerForm({ player, onSubmit, isLoading }: EditPlayerFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdatePlayerFormData>({
    resolver: zodResolver(updatePlayerSchema),
    defaultValues: {
      surname: player.surname,
      sex: player.sex as 'M' | 'F',
      role: player.role,
    },
  })

  const currentSex = watch('sex')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="edit-surname">Name *</Label>
        <Input
          {...register('surname')}
          id="edit-surname"
          type="text"
          placeholder="Enter player name"
          className="min-h-11"
        />
        {errors.surname && (
          <p className="text-sm text-destructive">{errors.surname.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Sex *</Label>
        <RadioGroup
          value={currentSex}
          onValueChange={(value) => setValue('sex', value as 'M' | 'F')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="M" id="edit-sex-m" className="min-h-6 min-w-6" />
            <Label htmlFor="edit-sex-m" className="cursor-pointer">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="F" id="edit-sex-f" className="min-h-6 min-w-6" />
            <Label htmlFor="edit-sex-f" className="cursor-pointer">Female</Label>
          </div>
        </RadioGroup>
        {errors.sex && (
          <p className="text-sm text-destructive">{errors.sex.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-role">Role</Label>
        <Select
          onValueChange={(value) => setValue('role', value as 'player' | 'manager')}
          defaultValue={watch('role')}
        >
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="player">Player</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && (
          <p className="text-sm text-destructive">{errors.role.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full min-h-11"
      >
        {isLoading ? 'Saving...' : 'Update Player'}
      </Button>
    </form>
  )
}
