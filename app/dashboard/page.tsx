'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth'
import { fetchTeamProjects, fetchAllTeams } from '@/api/queries'
import { ProjectCard } from '@/components/ProjectCard'
import { AppShell } from '@/components/AppShell'
import { Loader2, RefreshCw, AlertCircle, Search } from 'lucide-react'
import { useState } from 'react'
import type { Team } from '@/types/teams'

export default function DashboardPage() {
  const { currentConnection } = useAuthStore()
  const token = currentConnection?.apiToken ?? ''
  const teamId = currentConnection?.currentTeamId ?? ''

  const [search, setSearch] = useState('')

  const teamsQuery = useQuery({
    queryKey: ['teams', token],
    queryFn: () => fetchAllTeams(token),
    enabled: !!token,
  })

  const projectsQuery = useQuery({
    queryKey: ['projects', token, teamId],
    queryFn: () => fetchTeamProjects(token, teamId, { latestDeployments: 3 }),
    enabled: !!token && !!teamId,
    refetchInterval: 30_000,
  })

  const teams: Team[] = teamsQuery.data?.teams ?? []
  const allProjects = projectsQuery.data?.projects ?? []
  const filtered = search.trim()
    ? allProjects.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : allProjects

  return (
    <AppShell teams={teams}>
      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-foreground text-xl font-semibold font-sans">Projects</h1>
            {allProjects.length > 0 && (
              <p className="text-muted-foreground text-sm mt-0.5">
                {allProjects.length} project{allProjects.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <button
            onClick={() => projectsQuery.refetch()}
            disabled={projectsQuery.isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground hover:border-foreground/20 text-xs transition-colors disabled:opacity-50"
            aria-label="Refresh projects"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${projectsQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Search */}
        {allProjects.length > 0 && (
          <div className="relative mb-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects..."
              className="w-full bg-card border border-border rounded-md pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring max-w-sm"
            />
          </div>
        )}

        {/* States */}
        {projectsQuery.isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {projectsQuery.isError && (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <AlertCircle className="w-8 h-8 text-error" />
            <p className="text-foreground font-medium">Failed to load projects</p>
            <p className="text-muted-foreground text-sm max-w-xs">
              {(projectsQuery.error as Error)?.message ?? 'An unexpected error occurred.'}
            </p>
            <button
              onClick={() => projectsQuery.refetch()}
              className="mt-2 px-4 py-1.5 rounded-md border border-border text-sm text-foreground hover:bg-accent transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {!projectsQuery.isLoading && !projectsQuery.isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-24 text-center">
            <p className="text-foreground font-medium">
              {search ? 'No projects match your search' : 'No projects found'}
            </p>
            <p className="text-muted-foreground text-sm">
              {search ? 'Try a different search term.' : 'This team has no projects yet.'}
            </p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
