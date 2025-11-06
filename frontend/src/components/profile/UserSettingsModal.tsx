'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser, useUpdateUser, useChangePassword } from '@/hooks/useUsers'
import type { PublicUser } from '@/interfaces/user'
import {
  passwordChangeSchema,
  userProfileSchema,
  type PasswordChangeFormValues,
  type UserProfileFormValues,
} from '@/interfaces/user.schemas'

type UserSettingsModalProps = {
  userId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UserSettingsModal({ userId, open, onOpenChange }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile')
  const { data: user, isLoading } = useUser(userId, { enabled: open })
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const queryClient = useQueryClient()

  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
    },
  })

  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  useEffect(() => {
    if (user && open) {
      profileForm.reset({
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email,
      })
    }
  }, [user, open, profileForm])

  useEffect(() => {
    if (!open) {
      setActiveTab('profile')
      profileForm.reset()
      passwordForm.reset()
    }
  }, [open, profileForm, passwordForm])

  const isProfileSubmitting = profileForm.formState.isSubmitting || updateUser.isPending
  const isPasswordSubmitting = passwordForm.formState.isSubmitting || changePassword.isPending

  const profileErrorMessages = profileForm.formState.errors
  const passwordErrorMessages = passwordForm.formState.errors

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    const payload = {
      id: userId,
      firstname: values.firstname,
      lastname: values.lastname,
      email: values.email,
    }

    updateUser.mutate(payload, {
      onSuccess: (updated) => {
        if (user) {
          const nextUser: PublicUser = { ...user, ...updated }
          queryClient.setQueryData(['user', userId], nextUser)
          profileForm.reset({
            firstname: nextUser.firstname ?? '',
            lastname: nextUser.lastname ?? '',
            email: nextUser.email,
          })
        } else {
          queryClient.invalidateQueries({ queryKey: ['user', userId] })
        }
        onOpenChange(false)
      },
    })
  })

  const handlePasswordSubmit = passwordForm.handleSubmit((values) => {
    changePassword.mutate(
      {
        id: userId,
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => {
          passwordForm.reset()
          onOpenChange(false)
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Réglages du profil</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="profile">Profil</TabsTrigger>
              <TabsTrigger value="password">Mot de passe</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstname">Prénom</Label>
                  <Input
                    id="firstname"
                    type="text"
                    autoComplete="given-name"
                    {...profileForm.register('firstname')}
                  />
                  {profileErrorMessages.firstname ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileErrorMessages.firstname.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastname">Nom</Label>
                  <Input
                    id="lastname"
                    type="text"
                    autoComplete="family-name"
                    {...profileForm.register('lastname')}
                  />
                  {profileErrorMessages.lastname ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileErrorMessages.lastname.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    {...profileForm.register('email')}
                  />
                  {profileErrorMessages.email ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileErrorMessages.email.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isProfileSubmitting}>
                    {isProfileSubmitting ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="password">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    {...passwordForm.register('currentPassword')}
                  />
                  {passwordErrorMessages.currentPassword ? (
                    <p className="text-sm text-destructive" role="alert">
                      {passwordErrorMessages.currentPassword.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('newPassword')}
                  />
                  {passwordErrorMessages.newPassword ? (
                    <p className="text-sm text-destructive" role="alert">
                      {passwordErrorMessages.newPassword.message}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Minimum 12 caractères, dont majuscule, minuscule, chiffre et caractère
                      spécial.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmation</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    {...passwordForm.register('confirmPassword')}
                  />
                  {passwordErrorMessages.confirmPassword ? (
                    <p className="text-sm text-destructive" role="alert">
                      {passwordErrorMessages.confirmPassword.message}
                    </p>
                  ) : null}
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isPasswordSubmitting}>
                    {isPasswordSubmitting ? 'Mise à jour…' : 'Modifier le mot de passe'}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
