'use client'

import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { fetchTeamDeployments, fetchTeamProjectDomains, fetchTeamProjectEnvironmentVariables, fetchAllTeams } from '@/api/queries'
import { deleteDeployment, promoteDeployment, redeployDeployment, addDomain, removeDomain, addEnvironmentVariable, deleteEnvironmentVariable } from '@/api/mutations'
import { AppShell } from '@/components/AppShell'
import { StatusBadge } from '@/components/StatusBadge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { formatDeploymentShortId, formatFrameworkName } from '@/lib/format'
import {
  Loader2, AlertCircle, ArrowLeft, GitBranch, Clock, Globe,
  RefreshCw, Trash2, ChevronUp, RotateCcw, Plus, Copy, Check,
  Eye, EyeOff, Lock, Key, ExternalLink
} from 'lucide-react'
import { useState } from 'react'
import { use } from 'react'
import type { CommonEnvironmentVariable } from '@/types/common'
import type { Deployment } from '@/types/deployments'
import type { Domain } from '@/types/domains'

type Tab = 'deployments' | 'domains' | 'environment'

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const { currentConnection } = useAuthStore()
  const token = currentConnection?.apiToken ?? ''
  const teamId = currentConnection?.currentTeamId ?? ''

  const [activeTab, setActiveTab] = useState<Tab>('deployments')

  const teamsQuery = useQuery({
    queryKey: ['teams', token],
    queryFn: () => fetchAllTeams(token),
    enabled: !!token,
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'deployments', label: 'Deployments' },
    { id: 'domains', label: 'Domains' },
    { id: 'environment', label: 'Environment' },
  ]

  return (
    <AppShell teams={teamsQuery.data?.teams ?? []}>
      <div className="px-6 py-6 max-w-5xl mx-auto">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Projects
        </Link>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-border mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'deployments' && (
          <DeploymentsTab token={token} teamId={teamId} projectId={projectId} />
        )}
        {activeTab === 'domains' && (
          <DomainsTab token={token} teamId={teamId} projectId={projectId} />
        )}
        {activeTab === 'environment' && (
          <EnvironmentTab token={token} teamId={teamId} projectId={projectId} />
        )}
      </div>
    </AppShell>
  )
}

/* ─────────────────────────────── DEPLOYMENTS TAB ─────────────────────────────── */

function DeploymentsTab({ token, teamId, projectId }: { token: string; teamId: string; projectId: string }) {
  const queryClient = useQueryClient()

  const deploymentsQuery = useQuery({
    queryKey: ['deployments', token, teamId, projectId],
    queryFn: () => fetchTeamDeployments(token, teamId, { projectId, limit: 20, withGitRepoInfo: true }),
    enabled: !!token && !!teamId,
  })

  const deleteMutation = useMutation({
    mutationFn: (deploymentId: string) => deleteDeployment(token, teamId, deploymentId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments', token, teamId, projectId] }),
  })

  const promoteMutation = useMutation({
    mutationFn: ({ deploymentId }: { deploymentId: string }) =>
      promoteDeployment(token, teamId, deploymentId, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments', token, teamId, projectId] }),
  })

  const redeployMutation = useMutation({
    mutationFn: ({ deploymentId, name }: { deploymentId: string; name: string }) =>
      redeployDeployment(token, teamId, deploymentId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['deployments', token, teamId, projectId] }),
  })

  if (deploymentsQuery.isLoading) return <CenteredSpinner />
  if (deploymentsQuery.isError) return <ErrorState message={(deploymentsQuery.error as Error).message} onRetry={() => deploymentsQuery.refetch()} />

  const deployments = deploymentsQuery.data?.deployments ?? []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-muted-foreground text-sm">{deployments.length} deployment{deployments.length !== 1 ? 's' : ''}</span>
        <button onClick={() => deploymentsQuery.refetch()} disabled={deploymentsQuery.isFetching} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${deploymentsQuery.isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {deployments.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">No deployments found.</div>
      )}

      {deployments.map((d) => (
        <DeploymentRow
          key={d.id}
          deployment={d}
          onDelete={() => deleteMutation.mutate(d.id)}
          onPromote={() => promoteMutation.mutate({ deploymentId: d.id })}
          onRedeploy={() => redeployMutation.mutate({ deploymentId: d.id, name: d.name })}
          isActing={
            (deleteMutation.isPending && deleteMutation.variables === d.id) ||
            (promoteMutation.isPending && promoteMutation.variables?.deploymentId === d.id) ||
            (redeployMutation.isPending && redeployMutation.variables?.deploymentId === d.id)
          }
        />
      ))}
    </div>
  )
}

function DeploymentRow({
  deployment: d,
  onDelete,
  onPromote,
  onRedeploy,
  isActing,
}: {
  deployment: Deployment
  onDelete: () => void
  onPromote: () => void
  onRedeploy: () => void
  isActing: boolean
}) {
  const isProduction = d.target === 'production'
  const shortId = formatDeploymentShortId(d)
  const branch = d.meta?.githubCommitRef
  const commitMsg = d.meta?.githubCommitMessage

  return (
    <div className={cn(
      'bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-4',
      isProduction && 'border-foreground/20'
    )}>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <Link href={`/deployments/${d.id}`} className="text-foreground text-sm font-medium hover:underline underline-offset-2 font-mono">
            {shortId}
          </Link>
          {isProduction && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground border border-border">
              Production
            </span>
          )}
        </div>
        {commitMsg && <p className="text-muted-foreground text-xs truncate">{commitMsg}</p>}
        <div className="flex items-center gap-3 text-muted-foreground">
          {branch && (
            <span className="flex items-center gap-1 text-xs">
              <GitBranch className="w-3 h-3" />{branch}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>

      <StatusBadge status={d.readyState} />

      {/* Actions */}
      {isActing ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground flex-shrink-0" />
      ) : (
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isProduction && d.readyState === 'READY' && (
            <ActionButton onClick={onPromote} title="Promote to production" icon={<ChevronUp className="w-3.5 h-3.5" />} />
          )}
          <ActionButton onClick={onRedeploy} title="Redeploy" icon={<RotateCcw className="w-3.5 h-3.5" />} />
          <ActionButton onClick={onDelete} title="Delete deployment" icon={<Trash2 className="w-3.5 h-3.5" />} danger />
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────── DOMAINS TAB ─────────────────────────────── */

function DomainsTab({ token, teamId, projectId }: { token: string; teamId: string; projectId: string }) {
  const queryClient = useQueryClient()
  const [newDomain, setNewDomain] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const domainsQuery = useQuery({
    queryKey: ['domains', token, teamId, projectId],
    queryFn: () => fetchTeamProjectDomains(token, teamId, projectId),
    enabled: !!token && !!teamId,
  })

  const addMutation = useMutation({
    mutationFn: (name: string) => addDomain(token, teamId, projectId, { name }),
    onSuccess: () => {
      setNewDomain('')
      setAddError(null)
      queryClient.invalidateQueries({ queryKey: ['domains', token, teamId, projectId] })
    },
    onError: (err) => setAddError((err as Error).message),
  })

  const removeMutation = useMutation({
    mutationFn: (domain: string) => removeDomain(token, teamId, projectId, domain),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['domains', token, teamId, projectId] }),
  })

  if (domainsQuery.isLoading) return <CenteredSpinner />
  if (domainsQuery.isError) return <ErrorState message={(domainsQuery.error as Error).message} onRetry={() => domainsQuery.refetch()} />

  const domains: Domain[] = domainsQuery.data?.domains ?? []

  return (
    <div className="flex flex-col gap-4">
      {/* Add domain */}
      <form
        onSubmit={(e) => { e.preventDefault(); if (newDomain.trim()) addMutation.mutate(newDomain.trim()) }}
        className="flex gap-2"
      >
        <input
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 bg-card border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!newDomain.trim() || addMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </form>
      {addError && <p className="text-error text-xs">{addError}</p>}

      {/* Domain list */}
      {domains.length === 0 && (
        <div className="py-16 text-center text-muted-foreground text-sm">No custom domains configured.</div>
      )}

      {domains.map((d) => (
        <div key={d.name} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
          <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-foreground text-sm font-medium truncate">{d.name}</span>
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded border',
                d.verified ? 'text-success border-success/30 bg-success/10' : 'text-warning border-warning/30 bg-warning/10'
              )}>
                {d.verified ? 'Verified' : 'Pending'}
              </span>
            </div>
            {d.gitBranch && <p className="text-muted-foreground text-xs mt-0.5">{d.gitBranch}</p>}
          </div>
          <a href={`https://${d.name}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Open domain">
            <ExternalLink className="w-4 h-4" />
          </a>
          <button
            onClick={() => removeMutation.mutate(d.name)}
            disabled={removeMutation.isPending && removeMutation.variables === d.name}
            className="text-muted-foreground hover:text-error transition-colors disabled:opacity-50"
            title="Remove domain"
          >
            {removeMutation.isPending && removeMutation.variables === d.name
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Trash2 className="w-4 h-4" />}
          </button>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────── ENVIRONMENT TAB ─────────────────────────────── */

function EnvironmentTab({ token, teamId, projectId }: { token: string; teamId: string; projectId: string }) {
  const queryClient = useQueryClient()
  const [showAdd, setShowAdd] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')
  const [newTarget, setNewTarget] = useState<('production' | 'preview' | 'development')[]>(['production', 'preview', 'development'])
  const [addError, setAddError] = useState<string | null>(null)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  const envsQuery = useQuery({
    queryKey: ['envs', token, teamId, projectId],
    queryFn: () => fetchTeamProjectEnvironmentVariables(token, teamId, projectId),
    enabled: !!token && !!teamId,
  })

  const addMutation = useMutation({
    mutationFn: () => addEnvironmentVariable(token, teamId, projectId, {
      key: newKey.trim(),
      value: newValue,
      target: newTarget,
      type: 'encrypted',
    }),
    onSuccess: () => {
      setNewKey(''); setNewValue(''); setShowAdd(false); setAddError(null)
      queryClient.invalidateQueries({ queryKey: ['envs', token, teamId, projectId] })
    },
    onError: (err) => setAddError((err as Error).message),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEnvironmentVariable(token, teamId, projectId, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['envs', token, teamId, projectId] }),
  })

  if (envsQuery.isLoading) return <CenteredSpinner />
  if (envsQuery.isError) return <ErrorState message={(envsQuery.error as Error).message} onRetry={() => envsQuery.refetch()} />

  const envs: CommonEnvironmentVariable[] = envsQuery.data?.envs ?? []

  const targetOptions: ('production' | 'preview' | 'development')[] = ['production', 'preview', 'development']

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{envs.length} variable{envs.length !== 1 ? 's' : ''}</span>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Variable
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-foreground text-xs font-medium">Key</label>
              <input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="MY_VARIABLE"
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-foreground text-xs font-medium">Value</label>
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="value"
                className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {targetOptions.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTarget.includes(t)}
                  onChange={(e) =>
                    setNewTarget(e.target.checked ? [...newTarget, t] : newTarget.filter((x) => x !== t))
                  }
                  className="accent-primary"
                />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </label>
            ))}
          </div>
          {addError && <p className="text-error text-xs">{addError}</p>}
          <div className="flex gap-2">
            <button
              onClick={() => addMutation.mutate()}
              disabled={!newKey.trim() || addMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Env list */}
      {envs.length === 0 && !showAdd && (
        <div className="py-16 text-center text-muted-foreground text-sm">No environment variables defined.</div>
      )}

      {envs.map((env) => (
        <EnvRow
          key={env.id}
          env={env}
          revealed={revealedIds.has(env.id)}
          onToggleReveal={() =>
            setRevealedIds((prev) => {
              const next = new Set(prev)
              next.has(env.id) ? next.delete(env.id) : next.add(env.id)
              return next
            })
          }
          onDelete={() => deleteMutation.mutate(env.id)}
          isDeleting={deleteMutation.isPending && deleteMutation.variables === env.id}
        />
      ))}
    </div>
  )
}

function EnvRow({
  env,
  revealed,
  onToggleReveal,
  onDelete,
  isDeleting,
}: {
  env: CommonEnvironmentVariable
  revealed: boolean
  onToggleReveal: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const [copied, setCopied] = useState(false)

  function copyKey() {
    navigator.clipboard.writeText(env.key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-3">
      <Key className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-foreground text-sm font-mono font-medium truncate">{env.key}</span>
          {env.type === 'sensitive' && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs font-mono">
            {revealed && env.value ? env.value : '••••••••'}
          </span>
          <span className="text-muted-foreground/60 text-xs">
            {env.target?.join(', ')}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {env.value && (
          <ActionButton onClick={onToggleReveal} title={revealed ? 'Hide value' : 'Show value'} icon={revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} />
        )}
        <ActionButton onClick={copyKey} title="Copy key" icon={copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} />
        <ActionButton onClick={onDelete} title="Delete" icon={isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} danger />
      </div>
    </div>
  )
}

/* ─────────────────────────────── SHARED ATOMS ─────────────────────────────── */

function ActionButton({
  onClick,
  title,
  icon,
  danger,
}: {
  onClick: () => void
  title: string
  icon: React.ReactNode
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        danger
          ? 'text-muted-foreground hover:text-error hover:bg-error/10'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      {icon}
    </button>
  )
}

function CenteredSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <AlertCircle className="w-8 h-8 text-error" />
      <p className="text-foreground font-medium">Something went wrong</p>
      <p className="text-muted-foreground text-sm max-w-xs">{message}</p>
      <button onClick={onRetry} className="mt-2 px-4 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-accent transition-colors">
        Try again
      </button>
    </div>
  )
}
