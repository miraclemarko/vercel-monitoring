import vercel from '@/lib/vercel'
import type {
  CommonApiStatus,
  CommonDeploymentStatus,
  CommonEnvironmentVariable,
  CommonPagination,
} from '@/types/common'
import type {
  Deployment,
  DeploymentBuild,
  DeploymentBuildAsset,
  DeploymentBuildMetadata,
} from '@/types/deployments'
import type { Domain, DomainConfig } from '@/types/domains'
import type { Log } from '@/types/logs'
import type { DeploymentBuildLog } from '@/types/old'
import type { Project } from '@/types/projects'
import type { Team } from '@/types/teams'
import type { User } from '@/types/user'
import type { Webhook } from '@/types/webhooks'
import ms from 'ms'

const TRAILING_SLASHES_REGEX = /\/+$/
const ABSOLUTE_URL_REGEX = /^https?:\/\//i
const LINK_ICON_HREF_REGEX =
  /<link[^>]*rel=["'][^"']*(?:icon|shortcut icon|apple-touch-icon)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>/i

function roundToGranularity(date: Date, granularity: '5m' | '1h', mode: 'up' | 'down' = 'up'): Date {
  const granularityMs = granularity === '5m' ? 5 * ms('1m') : ms('1h')
  const rounded = Math.floor(date.getTime() / granularityMs) * granularityMs
  if (mode === 'up') return new Date(rounded)
  return new Date(rounded - granularityMs)
}

export async function fetchApiStatus(token: string) {
  return vercel.get<CommonApiStatus[]>('/status', token)
}

export async function fetchUserInfo(token: string) {
  const response = await vercel.get<{ user: User }>('/www/user', token)
  return response.user
}

export async function fetchAllTeams(token: string, opts: { flags?: boolean; permissions?: boolean } = {}) {
  const params = new URLSearchParams()
  if (opts.flags) params.append('flags', 'true')
  if (opts.permissions) params.append('permissions', 'true')
  return vercel.get<{ teams: Team[] }>(`/teams?${params}`, token)
}

export async function fetchTeamProjects(
  token: string,
  teamId: string,
  opts: { from?: number; limit?: number; latestDeployments?: number } = {}
) {
  const params = new URLSearchParams({
    teamId,
    latestDeployments: String(opts.latestDeployments ?? 5),
  })
  if (opts.limit) params.append('limit', String(opts.limit))
  if (opts.from) params.append('from', String(opts.from))
  return vercel.get<{ projects: Project[]; pagination: CommonPagination }>(`/v9/projects?${params}`, token)
}

export async function fetchTeamDeployments(
  token: string,
  teamId: string,
  opts: {
    limit?: number
    target?: 'production' | 'preview'
    withGitRepoInfo?: boolean
    state?: CommonDeploymentStatus[]
    projectId?: string
  } = {}
) {
  const params = new URLSearchParams({ teamId })
  if (opts.limit) params.append('limit', String(opts.limit))
  if (opts.target) params.append('target', opts.target)
  if (opts.state?.length) params.append('state', opts.state.join(','))
  if (opts.projectId) params.append('projectId', opts.projectId)
  if (opts.withGitRepoInfo) params.append('withGitRepoInfo', 'true')
  return vercel.get<{ deployments: Deployment[]; pagination: { count: number; next: string | null; previous: string | null } }>(
    `/v6/deployments?${params}`,
    token
  )
}

export async function fetchTeamDeployment(token: string, teamId: string, deploymentId: string) {
  const params = new URLSearchParams({ teamId, includeDeleted: 'true' })
  return vercel.get<Deployment>(`/v13/deployments/${deploymentId}?${params}`, token)
}

export async function fetchProductionDeployment(token: string, teamId: string, projectId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.get<{ deployment: Deployment; deploymentIsStale: boolean; rollbackDescription: null | unknown }>(
    `/projects/${projectId}/production-deployment?${params}`,
    token
  )
}

export async function fetchTeamDeploymenBuildLogs(token: string, teamId: string, deploymentId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.get<DeploymentBuildLog[]>(`/v3/deployments/${deploymentId}/events?${params}`, token)
}

export async function fetchTeamDeploymenBuildFileTree(
  token: string,
  teamId: string,
  deploymentUrl: string,
  base: 'src' | 'out' | string
) {
  const params = new URLSearchParams({ teamId, base })
  return vercel.get<DeploymentBuildAsset[]>(`/file-tree/${deploymentUrl}?${params}`, token)
}

export async function fetchTeamProjectDomains(
  token: string,
  teamId: string,
  projectId: string,
  from?: number
) {
  const params = new URLSearchParams({ teamId })
  if (from) params.append('from', String(from))
  return vercel.get<{ pagination: CommonPagination; domains: Domain[] }>(
    `/projects/${projectId}/domains?${params}`,
    token
  )
}

export async function fetchTeamProjectDomainConfig(token: string, teamId: string, domain: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.get<DomainConfig>(`/v6/domains/${domain}/config?${params}`, token)
}

export async function fetchTeamProjectEnvironmentVariables(
  token: string,
  teamId: string,
  projectId: string
) {
  const params = new URLSearchParams({ teamId, decrypt: 'false' })
  return vercel.get<{ envs: CommonEnvironmentVariable[] }>(`/v9/projects/${projectId}/env?${params}`, token)
}

export async function fetchTeamLogs(
  token: string,
  teamId: string,
  projectId: string,
  opts: { limit?: number; since?: number; until?: number } = {}
) {
  const params = new URLSearchParams({ teamId, projectId, limit: String(opts.limit ?? 100) })
  if (opts.since) params.append('since', String(opts.since))
  if (opts.until) params.append('until', String(opts.until))
  return vercel.get<Log[]>(`/v1/logs?${params}`, token)
}

export async function fetchWebhook(
  token: string,
  teamId: string,
  pushToken: string
) {
  const params = new URLSearchParams({ teamId })
  const response = await vercel.get<{ webhooks: Webhook[] }>(`/v1/webhooks?${params}`, token)
  return response?.webhooks?.find((w) => w.url.includes(pushToken.substring(0, 8))) ?? null
}

export async function fetchProjectAnalyticsAvailability(
  token: string,
  teamId: string,
  projectId: string
): Promise<{ isEnabled: boolean; hasData: boolean }> {
  const params = new URLSearchParams({ projectId, teamId })
  const response = await fetch(`https://vercel.com/api/v1/web/insights/enabled?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!response.ok) throw new Error(`Error fetching analytics availability: ${response.status}`)
  return response.json()
}

export async function fetchProjectFirewallRules(token: string, teamId: string, projectId: string) {
  const params = new URLSearchParams({ projectId, teamId })
  return vercel.get<{
    active: {
      firewallEnabled: boolean
      rules: { name: string; active: boolean; description: string; id: string }[]
    } | null
    draft: null | unknown
  }>(`/v1/security/firewall/config?${params}`, token)
}

export async function fetchObservabilityTTFB(token: string, teamId: string, projectId: string) {
  const endTime = roundToGranularity(new Date(), '5m', 'down').toISOString()
  const startTime = roundToGranularity(new Date(Date.now() - ms('12h')), '5m', 'up').toISOString()
  return vercel.post<{
    summary: { avgTtfb: number; p75Ttfb: number; p95Ttfb: number }[]
  }>(`/observability/metrics?ownerId=${teamId}`, token, {
    event: 'serverlessFunctionInvocation',
    rollups: {
      avgTtfb: { measure: 'ttfbMs', aggregation: 'avg' },
      p75Ttfb: { measure: 'ttfbMs', aggregation: 'p75' },
      p95Ttfb: { measure: 'ttfbMs', aggregation: 'p95' },
    },
    tailRollup: 'truncate',
    summaryOnly: true,
    scope: { type: 'project', ownerId: teamId, projectIds: [projectId] },
    reason: 'observability_chart_free',
    granularity: { minutes: 5 },
    endTime,
    startTime,
    filter: "environment eq 'production'",
  })
}
