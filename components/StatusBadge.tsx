import { cn } from '@/lib/utils'
import type { CommonDeploymentStatus } from '@/types/common'

const STATUS_CONFIG: Record<
  CommonDeploymentStatus,
  { label: string; dotClass: string; textClass: string }
> = {
  READY: { label: 'Ready', dotClass: 'bg-success', textClass: 'text-success' },
  BUILDING: { label: 'Building', dotClass: 'bg-warning animate-pulse', textClass: 'text-warning' },
  QUEUED: { label: 'Queued', dotClass: 'bg-muted-foreground', textClass: 'text-muted-foreground' },
  INITIALIZING: { label: 'Initializing', dotClass: 'bg-muted-foreground animate-pulse', textClass: 'text-muted-foreground' },
  ERROR: { label: 'Error', dotClass: 'bg-error', textClass: 'text-error' },
  CANCELED: { label: 'Canceled', dotClass: 'bg-error/50', textClass: 'text-muted-foreground' },
}

interface StatusBadgeProps {
  status: CommonDeploymentStatus
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.ERROR
  return (
    <span className={cn('flex items-center gap-1.5', config.textClass, className)}>
      {showDot && <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClass)} />}
      <span className="text-xs font-medium">{config.label}</span>
    </span>
  )
}
