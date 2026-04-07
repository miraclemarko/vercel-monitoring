'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'
import { LayoutDashboard, LogOut, Triangle, ChevronDown, Check } from 'lucide-react'
import { useState } from 'react'
import type { Team } from '@/types/teams'

interface SidebarProps {
  teams?: Team[]
}

export function Sidebar({ teams = [] }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { currentConnection, connections, switchConnection, removeConnection } = useAuthStore()
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false)

  function handleLogout() {
    if (currentConnection) removeConnection(currentConnection.id)
    document.cookie = 'vercel-token=; path=/; max-age=0'
    router.push('/login')
    router.refresh()
  }

  function handleSwitchTeam(teamId: string) {
    if (!currentConnection) return
    switchConnection({ connectionId: currentConnection.id, teamId })
    setTeamDropdownOpen(false)
    router.refresh()
  }

  const currentTeam = teams.find((t) => t.id === currentConnection?.currentTeamId)

  const navItems = [
    { href: '/dashboard', label: 'Projects', icon: LayoutDashboard },
  ]

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-card border-r border-border flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-border flex-shrink-0">
        <Triangle className="w-4 h-4 fill-foreground stroke-foreground" />
        <span className="text-foreground text-sm font-semibold font-sans">Vercel Monitoring</span>
      </div>

      {/* Team switcher */}
      {teams.length > 0 && (
        <div className="px-3 pt-3 pb-2 relative">
          <button
            onClick={() => setTeamDropdownOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2.5 py-2 rounded-md hover:bg-accent transition-colors text-left"
          >
            <span className="text-foreground text-sm font-medium truncate">
              {currentTeam?.name ?? 'Select team'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 ml-1" />
          </button>

          {teamDropdownOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-popover border border-border rounded-md shadow-lg z-50 py-1">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => handleSwitchTeam(team.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <span className="truncate">{team.name}</span>
                  {team.id === currentConnection?.currentTeamId && (
                    <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors',
                active
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom user section */}
      <div className="px-3 pb-4 border-t border-border pt-3 flex flex-col gap-1">
        {currentConnection && (
          <div className="px-2.5 py-1.5">
            <p className="text-foreground text-xs font-medium truncate">
              {currentConnection.displayName ?? 'Account'}
            </p>
            <p className="text-muted-foreground text-xs truncate">
              Token: ••••{currentConnection.apiToken.slice(-4)}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-full text-left"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
