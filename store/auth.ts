'use client'

import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface Connection {
  id: string
  apiToken: string
  currentTeamId: string | null
  displayName?: string
}

interface AuthStoreState {
  connections: Connection[]
  currentConnection: Connection | null
  addConnection: (connection: Connection) => void
  removeConnection: (connectionId: string) => void
  switchConnection: (args: { connectionId: string; teamId?: string }) => void
  updateConnectionTeam: (connectionId: string, teamId: string) => void
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      connections: [],
      currentConnection: null,

      addConnection: (connection) => {
        set((state) => ({
          connections: [...state.connections, connection],
          currentConnection: state.currentConnection ?? connection,
        }))
      },

      removeConnection: (connectionId) => {
        const newConnections = get().connections.filter((c) => c.id !== connectionId)
        const current = get().currentConnection
        set({
          connections: newConnections,
          currentConnection:
            current?.id === connectionId ? (newConnections[0] ?? null) : current,
        })
      },

      switchConnection: ({ connectionId, teamId }) => {
        const connection = get().connections.find((c) => c.id === connectionId)
        if (!connection) return
        const updated = { ...connection, currentTeamId: teamId ?? connection.currentTeamId }
        set({
          connections: get().connections.map((c) => (c.id === updated.id ? updated : c)),
          currentConnection: updated,
        })
      },

      updateConnectionTeam: (connectionId, teamId) => {
        const updated = get().connections.map((c) =>
          c.id === connectionId ? { ...c, currentTeamId: teamId } : c
        )
        const current = get().currentConnection
        set({
          connections: updated,
          currentConnection:
            current?.id === connectionId ? { ...current, currentTeamId: teamId } : current,
        })
      },
    }),
    {
      name: 'vercel-monitoring-auth',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
      ),
    }
  )
)
