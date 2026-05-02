import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function truncateText(text: string, maxLength: number = 50) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('tr-TR').format(num)
}