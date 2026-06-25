import type { PublicUser } from '@/interfaces/user'
import { MapPin } from 'lucide-react'

type Props = { user: PublicUser }

export default function CvPrintHeader({ user }: Props) {
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username

  return (
    <div className="hidden print:block mb-6 pb-4 border-b-2" style={{ borderColor: 'var(--cv-accent, #16a34a)' }}>
      <div className="flex justify-between items-start gap-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-black">{fullName}</h1>
          {user.availability && (
            <p className="text-sm text-gray-600 mt-0.5">{user.availability}</p>
          )}
          {user.bio && (
            <p className="mt-2 text-sm text-gray-700 leading-relaxed">{user.bio}</p>
          )}
        </div>
        <div className="text-right text-sm text-gray-600 space-y-1 shrink-0">
          {user.location && (
            <p className="flex items-center justify-end gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {user.location}
            </p>
          )}
          {user.links?.map((link) => (
            <p key={link.id}>
              <a href={link.url} className="capitalize" style={{ color: 'var(--cv-accent, #15803d)' }}>
                {link.type}
              </a>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
