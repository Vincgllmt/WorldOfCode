'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useUser, useUpdateUser, useChangePassword, useDeleteUser } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'
import { BellRing, BellOff } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  passwordChangeSchema,
  userProfileSchema,
  type PasswordChangeFormValues,
  type UserProfileFormValues,
} from '@/interfaces/user.schemas'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

type UserSettingsModalProps = {
  userId: number
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: 'profile' | 'password' | 'notifications'
}

export default function UserSettingsModal({ userId, open, onOpenChange, initialTab = 'profile' }: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>(initialTab)
  const browserNotifs = useBrowserNotifications()
  const { data: user, isLoading } = useUser(userId, { enabled: open })
  const updateUser = useUpdateUser()
  const changePassword = useChangePassword()
  const deleteUser = useDeleteUser()
  const { logout } = useAuth()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const profileForm = useForm<UserProfileFormValues>({
    resolver: zodResolver(userProfileSchema),
    defaultValues: {
      username: '',
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
        username: user.username,
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email,
      })
    }
  }, [user, open, profileForm])

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab)
    } else {
      profileForm.reset()
      passwordForm.reset()
      setDeleteDialogOpen(false)
    }
  }, [open, initialTab, profileForm, passwordForm])

  const isProfileSubmitting = profileForm.formState.isSubmitting || updateUser.isPending
  const isPasswordSubmitting = passwordForm.formState.isSubmitting || changePassword.isPending
  const isDeletePending = deleteUser.isPending

  const profileErrorMessages = profileForm.formState.errors
  const passwordErrorMessages = passwordForm.formState.errors

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    const role = user?.role ?? 'ROLE_USER'
    const confirmed = window.confirm('Vous allez être déconnecté pour appliquer ces changements. Continuer ?')
    if (!confirmed) {
      return
    }
    const payload = {
      id: userId,
      username: values.username,
      firstname: values.firstname,
      lastname: values.lastname,
      email: values.email,
      role,
    }

    updateUser.mutate(payload, {
      onSuccess: () => {
        onOpenChange(false)
        logout()
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
  const handleDeleteAccount = () => {
    deleteUser.mutate(userId, {
      onSuccess: () => {
        setDeleteDialogOpen(false)
        onOpenChange(false)
        logout()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Réglages du profil</DialogTitle>
          <DialogDescription>
            Modifiez vos informations de profil, votre mot de passe ou vos préférences de notifications.
          </DialogDescription>
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
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d’utilisateur</Label>
                  <Input
                    id="username"
                    type="text"
                    autoComplete="username"
                    {...profileForm.register('username')}
                  />
                  {profileErrorMessages.username ? (
                    <p className="text-sm text-destructive" role="alert">
                      {profileErrorMessages.username.message}
                    </p>
                  ) : null}
                </div>

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

            <TabsContent value="notifications">
              <div className="space-y-4 py-2">
                <div>
                  <h3 className="text-sm font-semibold">Notifications navigateur</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Recevez une notification système (en dehors du navigateur) quand vous n&apos;êtes pas sur l&apos;onglet.
                    Utile pour être alerté des nouveaux messages, likes et abonnements.
                  </p>
                </div>

                {!browserNotifs.isSupported ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                    Votre navigateur ne supporte pas les notifications.
                  </div>
                ) : browserNotifs.permission === 'denied' ? (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
                    Les notifications sont bloquées par votre navigateur. Autorisez-les dans les paramètres
                    du site (cadenas dans la barre d&apos;adresse), puis rechargez la page.
                  </div>
                ) : browserNotifs.enabled ? (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <div className="flex items-center gap-2 text-sm">
                      <BellRing className="h-4 w-4 text-primary" />
                      <span>Notifications activées</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        browserNotifs.disable()
                        toast.success('Notifications désactivées')
                      }}
                    >
                      <BellOff className="h-4 w-4 mr-2" />
                      Désactiver
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={async () => {
                      const ok = await browserNotifs.requestPermission()
                      if (ok) toast.success('Notifications activées')
                      else toast.error('Permission refusée')
                    }}
                  >
                    <BellRing className="h-4 w-4 mr-2" />
                    Activer les notifications
                  </Button>
                )}
              </div>
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

        <div className="mt-8 rounded-lg border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Supprimer définitivement votre compte et toutes vos données.
              </p>
            </div>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletePending}>
                  {isDeletePending ? 'Suppression…' : 'Supprimer mon compte'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer votre compte ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes vos publications, abonnements et données
                    seront supprimés définitivement.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletePending}>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletePending}
                  >
                    Confirmer la suppression
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
