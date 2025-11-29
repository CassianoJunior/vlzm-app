import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/auth-context'
import UserProfileForm from '@/components/user-profile-form'
import { toast } from 'sonner'
import { useUpdatePlayer } from '@/hooks/use-players'
import type { UpdateOwnProfileFormData } from '@/schemas/user-schema'

export default function Profile() {
  const { profile, refreshProfile } = useAuth()
  const updatePlayer = useUpdatePlayer()
  const [isLoading, setIsLoading] = useState(false)

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No profile found</div>
      </div>
    )
  }

  const handleSubmit = async (data: UpdateOwnProfileFormData) => {
    try {
      setIsLoading(true)
      await updatePlayer.mutateAsync({ id: profile.id, ...data })
      toast.success('Profile updated')
      // Refresh profile in context
      await refreshProfile()
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <UserProfileForm
            defaultValues={{ surname: profile.surname, sex: profile.sex as 'M' | 'F' }}
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  )
}
