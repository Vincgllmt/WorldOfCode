import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { PublicUser } from '@/interfaces/user'
import PublicCvContent from './PublicCvContent'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/cv/${token}`,
    { cache: 'no-store' }
  )
  if (!res.ok) {
    return { robots: { index: false, follow: false } }
  }
  const user: PublicUser = await res.json()
  const name = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username
  return {
    title: `CV de ${name} — World of Code`,
    robots: { index: false, follow: false },
  }
}

export default async function PublicCvPage({ params }: Props) {
  const { token } = await params
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/cv/${token}`,
    { cache: 'no-store' }
  )

  if (!res.ok) notFound()

  const user: PublicUser = await res.json()

  return <PublicCvContent user={user} />
}
