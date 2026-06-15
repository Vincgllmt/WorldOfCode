'use client'

import { ReactNode } from 'react'
import Link from 'next/link'

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF1F0]">
      <div className="mx-auto min-h-screen max-w-[1280px] bg-white">
        {/* App bar dédiée Code Arena (remplace la navbar WOC) */}
        <header className="flex h-[62px] items-center justify-between bg-gradient-to-r from-[#0C9A48] to-[#17B95B] px-5 sm:px-[30px]">
          <Link href="/arena" className="flex items-center gap-[11px]">
            <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-white/35 bg-white/[0.18] font-mono text-[13px] font-bold text-white">
              {'</>'}
            </span>
            <span className="font-mono text-[17px] font-bold text-white">Code Arena</span>
          </Link>

          <Link
            href="/home"
            className="flex items-center gap-[7px] rounded-[10px] border border-white/[0.28] bg-white/[0.16] px-[14px] py-2 text-[13px] font-semibold text-white transition hover:bg-white/25"
          >
            <span aria-hidden>←</span>
            <span className="hidden sm:inline">Retour à </span>World of Code
          </Link>
        </header>

        <div className="px-4 pb-10 pt-6 sm:px-9 sm:pt-[30px]">{children}</div>
      </div>
    </div>
  )
}
