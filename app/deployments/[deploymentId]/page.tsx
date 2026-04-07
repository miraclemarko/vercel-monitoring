'use client'

import { use } from 'react'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { fetchTeamDeployment, fetchTeamDeploymenBuildLogs, fetchAllTeams } from '@/api/queries'
import { cancelDeployment, deleteDeployment, redeployDeployment, rollbackDeployment } from '@/api/mutations'
import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { formatDeploymentShortId } from '@/lib/format'
import {
  Loader2, AlertCircle, ArrowLeft, GitBranch, GitCommit,
  User, Globe, Clock, ExternalLink, RotateCcw, Trash2, XCircle,
  ChevronDown, Terminal
} from 'lucide-react'
import { useState } from 'react'
import type { DeploymentBuildLog } from '@/types/old'

export default function DeploymentPage({ params }: { params: Promise<{ deploymentId: string }> }) {
  const { deploymentId } = use(params)
  const { currentConnection } = useAuthStore()
  const token = currentConnection?.apiToken ?? ''
  const teamId = currentConnection?.currentTeamId ?? ''
  const queryClient = useQueryClient()

  const teamsQuery = useQuery({
    queryKey: ['teams', token],
    queryFn: () => fetchAllTeams(token),
    enabled: !!token,
  })

  const deploymentQuery = useQuery({
    queryKey: ['deployment', token, teamId, deploymentId],
    queryFn: () => fetchTeamDeployment(token, teamId, deploymentId),
    enabled: !!token && !!teamId,
    refetchInterval: (query) => {
      const state = query.state.data?.readyState
      if (state === 'BUILDING' || state === 'QUEUED' || state === 'INITIALIZING') return 5_000
      return false
    },
  })

  const logsQuery = useQuery({
    queryKey: ['deployment-logs', token, teamId, deploymentId],
    queryFn: () => fetchTeamDeploymenBuildLogs(token, teamId, deploymentId),
    enabled: !!token && !!teamId,
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelDeployment(token, teamId, deploymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployment', token, teamId, deploymentId] }),
  })

  const redeployMutation = useMutation({
    mutationFn: () => {
      const d = deploymentQuery.data
      return redeployDeployment(token, teamId, deploymentId, d?.name ?? '')
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployment', token, teamId, deploymentId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteDeployment(token, teamId, deploymentId),
  })

  const d = deploymentQuery.data
  const logs: DeploymentBuildLog[] = logsQuery.data ?? []
  const isActive = d?.readyState === 'BUILDING' || d?.readyState === 'QUEUED' || d?.readyState === 'INITIALIZING'

  return (
    <AppShell teams={teamsQuery.data?.teams ?? []}>
      <div className="px-6 py-6 max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href={d?.projectId ? `/projects/${d.projectId}` : '/dashboard'}
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {d?.name ?? 'Back'}
        </Link>

        {deploymentQuery.isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {deploymentQuery.isError && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertCircle className="w-8 h-8 text-error" />
            <p className="text-foreground font-medium">Failed to load deployment</p>
            <p className="text-muted-foreground text-sm">{(deploymentQuery.error as Error).message}</p>
          </div>
        )}

        {d && (
          <div className="flex flex-col gap-6">
            {/* Header card */}
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h1 className="text-foreground font-semibold text-base font-mono truncate">
                      {formatDeploymentShortId(d)}
                    </h1>
                    <StatusBadge status={d.readyState} />
                    {d.target && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground border border-border capitalize">
                        {d.target}
                      </span>
                    )}
                  </div>
                  {d.url && (
                    <a
                      href={`https://${d.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      {d.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isActive && (
                    <button
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
                    >
                      {cancelMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={() => redeployMutation.mutate()}
                    disabled={redeployMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors disabled:opacity-50"
                  >
                    {redeployMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Redeploy
                  </button>
                  <button
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-md text-xs text-muted-foreground hover:text-error hover:border-error/30 transition-colors disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete
                  </button>
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
                <MetaItem icon={<Clock className="w-3.5 h-3.5" />} label="Created">
                  {format(new Date(d.createdAt), 'MMM d, yyyy HH:mm')}
                </MetaItem>
                {d.meta?.githubCommitRef && (
                  <MetaItem icon={<GitBranch className="w-3.5 h-3.5" />} label="Branch">
                    {d.meta.githubCommitRef}
                  </MetaItem>
                )}
                {d.meta?.githubCommitSha && (
                  <MetaItem icon={<GitCommit className="w-3.5 h-3.5" />} label="Commit">
                    <span className="font-mono">{d.meta.githubCommitSha.slice(0, 7)}</span>
                  </MetaItem>
                )}
                {d.meta?.githubCommitAuthorName && (
                  <MetaItem icon={<User className="w-3.5 h-3.5" />} label="Author">
                    {d.meta.githubCommitAuthorName}
                  </MetaItem>
                )}
                {d.meta?.githubCommitMessage && (
                  <MetaItem icon={<GitCommit className="w-3.5 h-3.5" />} label="Message" className="col-span-2">
                    <span className="truncate">{d.meta.githubCommitMessage}</span>
                  </MetaItem>
                )}
              </div>
            </div>

            {/* Aliases */}
            {d.alias && d.alias.length > 0 && (
              <section>
                <h2 className="text-foreground text-sm font-semibold mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Domains
                </h2>
                <div className="flex flex-col gap-2">
                  {d.alias.map((alias) => (
                    <div key={alias} className="bg-card border border-border rounded-lg px-4 py-2.5 flex items-center justify-between">
                      <span className="text-foreground text-sm">{alias}</span>
                      <a href={`https://${alias}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Build logs */}
            <BuildLogsSection logs={logs} isLoading={logsQuery.isLoading} />
          </div>
        )}
      </div>
    </AppShell>
  )
}

function BuildLogsSection({ logs, isLoading }: { logs: DeploymentBuildLog[]; isLoading: boolean }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <section>
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-foreground text-sm font-semibold mb-3 w-full text-left"
      >
        <Terminal className="w-4 h-4" />
        Build Logs
        <span className="text-muted-foreground text-xs font-normal ml-auto flex items-center gap-1">
          {logs.length} lines
          <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', expanded && 'rotate-180')} />
        </span>
      </button>

      {expanded && (
        <div className="bg-black border border-border rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-muted-foreground text-sm px-4 py-8 text-center">No build logs available.</p>
          ) : (
            <div className="overflow-x-auto max-h-[520px] overflow-y-auto p-4 flex flex-col gap-0.5">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-3 group">
                  <span className="text-muted-foreground/40 text-xs font-mono flex-shrink-0 select-none w-16 text-right pt-px">
                    {new Date(log.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className={cn(
                    'text-xs font-mono whitespace-pre-wrap break-all leading-relaxed',
                    log.type === 'stderr' ? 'text-error' : 'text-foreground/80'
                  )}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function MetaItem({
  icon,
  label,
  children,
  className,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="flex items-center gap-1.5 text-muted-foreground text-xs">{icon}{label}</span>
      <span className="text-foreground text-sm">{children}</span>
    </div>
  )
}
