import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { updateOwnProfileSchema, type UpdateOwnProfileFormData } from '@/schemas/user-schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface Props {
  defaultValues: UpdateOwnProfileFormData
  onSubmit: (data: UpdateOwnProfileFormData) => Promise<void>
  isLoading?: boolean
}

export default function UserProfileForm({ defaultValues, onSubmit, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateOwnProfileFormData>({
    resolver: zodResolver(updateOwnProfileSchema),
    defaultValues,
  })

  const currentSex = watch('sex')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="surname">Name *</Label>
        <Input
          {...register('surname')}
          id="surname"
          type="text"
          placeholder="Enter your name"
          className="min-h-11"
        />
        {errors.surname && <p className="text-sm text-destructive">{errors.surname.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Sex *</Label>
        <RadioGroup
          value={currentSex}
          onValueChange={(value) => setValue('sex', value as 'M' | 'F')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="M" id="sex-m" />
            <Label htmlFor="sex-m">Male</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="F" id="sex-f" />
            <Label htmlFor="sex-f">Female</Label>
          </div>
        </RadioGroup>
        {errors.sex && <p className="text-sm text-destructive">{errors.sex.message}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="w-full min-h-11">
        {isLoading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  )
}
