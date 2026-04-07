import type { CommonDeploymentStatus } from '@/types/common'

export const VERCEL_API_URL = 'https://api.vercel.com'
export const VERCEL_AVATAR_API_URL = 'https://vercel.com/api/www/avatar'

// Tailwind class names for deployment status
export const CLASS_FOR_BUILD_STATUS: Record<CommonDeploymentStatus, string> = {
  QUEUED: 'text-muted-foreground',
  INITIALIZING: 'text-muted-foreground',
  BUILDING: 'text-warning',
  READY: 'text-success',
  ERROR: 'text-error',
  CANCELED: 'text-error',
} as const

export const CLASS_FOR_REQUEST_STATUS = (status: number): string => {
  if (status >= 500) return 'text-error'
  if (status >= 400) return 'text-warning'
  if (status >= 200 && status < 300) return 'text-success'
  return 'text-muted-foreground'
}
