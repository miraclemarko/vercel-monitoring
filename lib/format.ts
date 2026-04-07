const FRAMEWORK_LABELS: Record<string, string> = {
  nextjs: 'Next.js',
  react: 'React',
  vue: 'Vue',
  nuxt: 'Nuxt',
  sveltekit: 'SvelteKit',
  svelte: 'Svelte',
  astro: 'Astro',
  remix: 'Remix',
  gatsby: 'Gatsby',
  angular: 'Angular',
  vite: 'Vite',
  'create-react-app': 'CRA',
  static: 'Static',
  other: 'Other',
}

export function formatFrameworkName(framework: string): string {
  if (!framework) return 'Other'
  return FRAMEWORK_LABELS[framework.toLowerCase()] ?? framework
}

/** Returns a readable short ID like "dpl_abc123" → "abc123" or the last 7 chars of id */
export function formatDeploymentShortId(deployment: { id?: string; uid?: string }): string {
  const id = deployment.id ?? deployment.uid ?? ''
  // Vercel IDs are like "dpl_xxxx" — strip the prefix
  const clean = id.replace(/^dpl_/, '')
  return clean.slice(0, 9)
}
