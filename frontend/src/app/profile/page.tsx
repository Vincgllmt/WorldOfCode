'use client'

import ProfileDetails from '@/components/account/ProfileDetails'
import DeleteAccountButton from '@/components/account/DeleteAccountButton'

export default function ProfilePage() {
  return (
    <div className="max-w-xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold">Mon profil</h1>
      <ProfileDetails />
      <DeleteAccountButton />
    </div>
  )
}
