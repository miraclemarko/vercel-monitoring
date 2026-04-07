import Link from 'next/link'
import type { Project } from '@/types/projects'
import { StatusBadge } from '@/components/StatusBadge'
import { formatDeploymentShortId, formatFrameworkName } from '@/lib/format'
import { GitBranch, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const latestDeploy = project.latestDeployments?.[0]
  const productionDeploy = project.targets?.production ?? latestDeploy
  const status = productionDeploy?.readyState ?? latestDeploy?.readyState

  const deployUrl = productionDeploy?.alias?.[0] ?? productionDeploy?.url
  const branch = productionDeploy?.meta?.githubCommitRef ?? latestDeploy?.meta?.githubCommitRef
  const commitMsg =
    productionDeploy?.meta?.githubCommitMessage ?? latestDeploy?.meta?.githubCommitMessage
  const deployedAt = productionDeploy?.createdAt ?? latestDeploy?.createdAt

  return (
    <Link
      href={`/projects/${project.id}`}
      className={cn(
        'group block bg-card border border-border rounded-lg p-4',
        'hover:border-foreground/20 transition-colors duration-150'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 className="text-foreground text-sm font-semibold truncate">{project.name}</h2>
          {deployUrl && (
            <p className="text-muted-foreground text-xs truncate mt-0.5">{deployUrl}</p>
          )}
        </div>
        {status && <StatusBadge status={status} className="flex-shrink-0 mt-0.5" />}
      </div>

      <div className="flex flex-col gap-1.5">
        {branch && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <GitBranch className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs truncate">{branch}</span>
          </div>
        )}
        {commitMsg && (
          <p className="text-muted-foreground text-xs truncate pl-5">{commitMsg}</p>
        )}
        {deployedAt && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">
              {formatDistanceToNow(new Date(deployedAt), { addSuffix: true })}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-muted-foreground text-xs">
          {formatFrameworkName(project.framework ?? '')}
        </span>
        {latestDeploy && (
          <span className="text-muted-foreground text-xs font-mono">
            {formatDeploymentShortId(latestDeploy)}
          </span>
        )}
      </div>
    </Link>
  )
}
