'use client'

import { Dialog, DialogTrigger, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import UpdatePasswordForm from './UpdatePasswordForm'

export default function UpdateProfileForm() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Modifier mon mot de passe</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg space-y-6">
        <DialogTitle>Modifier mon mot de passe</DialogTitle>
        <hr />
        <UpdatePasswordForm />
      </DialogContent>
    </Dialog>
  )
}
