'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { fetchUserInfo, fetchAllTeams } from '@/api/queries'
import { VercelError } from '@/lib/vercel'
import { Eye, EyeOff, Triangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const addConnection = useAuthStore((s) => s.addConnection)

  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        const user = await fetchUserInfo(token.trim())
        const teamsData = await fetchAllTeams(token.trim())
        const teams = teamsData.teams ?? []

        // Pick the default team, or fall back to the first one
        const defaultTeam =
          teams.find((t) => t.id === user.defaultTeamId) ?? teams[0] ?? null

        const connectionId = user.uid

        addConnection({
          id: connectionId,
          apiToken: token.trim(),
          currentTeamId: defaultTeam?.id ?? null,
          displayName: user.name ?? user.username,
        })

        // Persist token in cookie so the middleware can read it
        document.cookie = `vercel-token=${token.trim()}; path=/; max-age=2592000; SameSite=Lax`

        router.push('/dashboard')
        router.refresh()
      } catch (err) {
        if (err instanceof VercelError && err.invalidToken) {
          setError('Invalid API token. Please check and try again.')
        } else {
          setError('Failed to authenticate. Please try again.')
        }
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2.5">
            <Triangle className="w-6 h-6 fill-foreground stroke-foreground" />
            <span className="text-foreground font-semibold text-lg font-sans">Vercel Monitoring</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h1 className="text-foreground text-lg font-semibold mb-1 font-sans">Connect to Vercel</h1>
          <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
            Enter your Vercel API token to monitor your projects and deployments.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="token" className="text-foreground text-sm font-medium">
                API Token
              </label>
              <div className="relative">
                <input
                  id="token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                  spellCheck={false}
                  className={cn(
                    'w-full bg-input border border-border rounded-md px-3 py-2 pr-10',
                    'text-foreground text-sm font-mono placeholder:text-muted-foreground/50',
                    'focus:outline-none focus:ring-1 focus:ring-ring',
                    error && 'border-error focus:ring-error'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showToken ? 'Hide token' : 'Show token'}
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {error && <p className="text-error text-xs">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={!token.trim() || isPending}
              className={cn(
                'flex items-center justify-center gap-2',
                'bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium',
                'hover:bg-primary/90 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect'
              )}
            </button>
          </form>
        </div>

        {/* Footer hint */}
        <p className="text-center text-muted-foreground text-xs mt-4 leading-relaxed">
          Generate a token at{' '}
          <a
            href="https://vercel.com/account/tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-2 hover:text-foreground/80"
          >
            vercel.com/account/tokens
          </a>
        </p>
      </div>
    </div>
  )
}
