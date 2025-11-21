import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function toLocalISOString(dateString: string) {
  const date = new Date(dateString)
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - (offset * 60000))
  return localDate.toISOString().slice(0, 16)
}
