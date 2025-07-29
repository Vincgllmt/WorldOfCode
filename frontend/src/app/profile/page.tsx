import ProfileDetails from '@/components/account/ProfileDetails'
import UpdateProfileForm from '@/components/account/UpdateProfileForm'

export default function ProfilePage() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Mon profil</h1>
      <div>
        <ProfileDetails />
        <UpdateProfileForm />
      </div>
    </div>
  )
}
