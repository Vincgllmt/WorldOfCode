'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { usePathname } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

export default function Navbar() {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  const navLinks = [
    { label: 'Accueil', href: '/' },
    { label: 'Groupes', href: '/group' },
  ]

  return (
    <nav className="w-full bg-green-50 border-b shadow-sm px-6 py-4 flex items-center justify-between">
      {/* Logo */}
      <Link href="/" className="text-xl font-bold text-black">
        World of Code
      </Link>

      {/* Menu */}
      <div className="flex items-center gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'text-sm font-medium hover:text-primary transition',
              pathname.startsWith(link.href)
                ? 'text-primary underline underline-offset-4'
                : 'text-muted-foreground'
            )}
          >
            {link.label}
          </Link>
        ))}

        {/* Avatar utilisateur */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="cursor-pointer">
                <AvatarFallback>
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/profile" className="font-medium cursor-pointer">
                  {user.username}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Déconnexion</DropdownMenuItem>
            </DropdownMenuContent>

          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
