import vercel from '@/lib/vercel'
import type { CommonEnvironment, CommonEnvironmentVariable } from '@/types/common'

export async function updateEnvironmentVariable(
  token: string,
  teamId: string,
  projectId: string,
  id: string,
  data: {
    target?: ('production' | 'preview' | 'development')[]
    key?: string
    value?: string
    comment?: string
    type?: 'encrypted' | 'sensitive'
  }
) {
  if (data.type === 'sensitive' && data.target?.includes('development')) {
    throw new Error('Sensitive environment variables cannot be created in the Development environment')
  }
  const params = new URLSearchParams({ teamId })
  return vercel.patch<CommonEnvironmentVariable>(`/v9/projects/${projectId}/env/${id}?${params}`, token, data)
}

export async function deleteEnvironmentVariable(
  token: string,
  teamId: string,
  projectId: string,
  id: string
) {
  const params = new URLSearchParams({ teamId })
  return vercel.delete(`/v7/projects/${projectId}/env/${id}?${params}`, token)
}

export async function addEnvironmentVariable(
  token: string,
  teamId: string,
  projectId: string,
  data: {
    key: string
    value: string
    comment?: string
    target: ('production' | 'preview' | 'development')[]
    type: 'sensitive' | 'encrypted'
  }
) {
  if (data.type === 'sensitive' && data.target?.includes('development')) {
    throw new Error('Sensitive environment variables cannot be created in the Development environment')
  }
  const params = new URLSearchParams({ teamId })
  return vercel.post<CommonEnvironmentVariable>(
    `/v10/projects/${projectId}/env?${params}`,
    token,
    [{ ...data, customEnvironmentIds: [], comment: data.comment ?? '' }]
  )
}

export async function deleteDeployment(token: string, teamId: string, deploymentId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.delete(`/v13/deployments/${deploymentId}?${params}`, token)
}

export async function promoteDeployment(token: string, teamId: string, deploymentId: string, projectId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.post(`/v10/projects/${projectId}/promote/${deploymentId}?${params}`, token)
}

export async function rollbackDeployment(token: string, teamId: string, deploymentId: string, projectId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.post(`/v9/projects/${projectId}/rollback/${deploymentId}?${params}`, token)
}

export async function cancelDeployment(token: string, teamId: string, deploymentId: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.patch(`/v12/deployments/${deploymentId}/cancel?${params}`, token)
}

export async function redeployDeployment(
  token: string,
  teamId: string,
  deploymentId: string,
  projectName: string,
  target?: CommonEnvironment
) {
  const params = new URLSearchParams({ teamId, forceNew: '1' })
  return vercel.post(`/v13/deployments?${params}`, token, {
    deploymentId,
    meta: { action: 'redeploy' },
    target,
    name: projectName,
  })
}

export async function addDomain(
  token: string,
  teamId: string,
  projectId: string,
  data: {
    name: string
    gitBranch?: string | null
    redirect?: string | null
    redirectStatusCode?: 307 | 301 | 302 | 308 | null
  }
) {
  if (data.redirect && data.gitBranch) throw new Error('Cannot set both redirect and gitBranch')
  if (data.redirect && !data.redirectStatusCode) data.redirectStatusCode = 307
  const params = new URLSearchParams({ teamId })
  return vercel.post(`/v10/projects/${projectId}/domains?${params}`, token, data)
}

export async function removeDomain(token: string, teamId: string, projectId: string, domain: string) {
  const params = new URLSearchParams({ teamId })
  return vercel.delete(`/v9/projects/${projectId}/domains/${domain}?${params}`, token)
}

export async function purgeDataCache(token: string, teamId: string, projectId: string) {
  const params = new URLSearchParams({ teamId, projectIdOrName: projectId })
  return vercel.delete(`/v1/data-cache/purge-all?${params}`, token)
}

export async function purgeCdnCache(token: string, teamId: string, projectId: string) {
  const params = new URLSearchParams({ teamId, projectIdOrName: projectId })
  return vercel.post(`/v1/edge-cache/purge-all?${params}`, token)
}

export async function toggleFirewall(
  token: string,
  teamId: string,
  projectId: string,
  attackModeEnabled: boolean
) {
  return vercel.post(`/v1/security/attack-mode?teamId=${teamId}`, token, {
    projectId,
    attackModeEnabled,
  })
}
