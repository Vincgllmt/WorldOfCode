import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const REASON_SEP = ' — '

export function parseReportReason(reason: string | null | undefined): { label: string | null; details: string | null } {
  if (!reason) return { label: null, details: null }
  const idx = reason.indexOf(REASON_SEP)
  if (idx === -1) return { label: reason, details: null }
  return { label: reason.substring(0, idx), details: reason.substring(idx + REASON_SEP.length) }
}
