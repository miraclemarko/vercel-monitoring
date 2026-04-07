'use client'

import { Sidebar } from '@/components/Sidebar'
import type { Team } from '@/types/teams'

interface AppShellProps {
  children: React.ReactNode
  teams?: Team[]
}

export function AppShell({ children, teams }: AppShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar teams={teams} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
