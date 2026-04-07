const API_BASE_URL = 'https://api.vercel.com'

export class VercelError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly invalidToken: boolean
  ) {
    super(message)
    this.name = 'VercelError'
  }
}

async function http<T>(path: string, token: string, config: RequestInit): Promise<T> {
  if (!token) {
    throw new Error('No API token provided')
  }

  const url = `${API_BASE_URL}${path}`

  const request = new Request(url, {
    ...config,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...config.headers,
    },
  })

  const response = await fetch(request)

  if (!response.ok) {
    let errJson: { error: { message: string; code: string; invalidToken?: boolean } }
    try {
      errJson = await response.json()
    } catch {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    throw new VercelError(
      errJson.error?.message ?? `HTTP ${response.status}`,
      errJson.error?.code ?? 'unknown',
      errJson.error?.invalidToken ?? false
    )
  }

  if (config.method === 'DELETE') return null as T

  const text = await response.text()
  if (!text) return null as T

  try {
    return JSON.parse(text) as T
  } catch {
    return null as T
  }
}

async function GET<T>(path: string, token: string, config?: RequestInit): Promise<T> {
  return http<T>(path, token, { method: 'GET', ...config })
}

async function POST<T>(
  path: string,
  token: string,
  body?: unknown,
  config?: RequestInit
): Promise<T> {
  return http<T>(path, token, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...config,
  })
}

async function PUT<T>(
  path: string,
  token: string,
  body: unknown,
  config?: RequestInit
): Promise<T> {
  return http<T>(path, token, {
    method: 'PUT',
    body: JSON.stringify(body),
    ...config,
  })
}

async function PATCH<T>(
  path: string,
  token: string,
  body?: unknown,
  config?: RequestInit
): Promise<T> {
  return http<T>(path, token, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...config,
  })
}

async function DELETE<T>(path: string, token: string, config?: RequestInit): Promise<T> {
  return http<T>(path, token, { method: 'DELETE', ...config })
}

const vercel = {
  get: GET,
  post: POST,
  put: PUT,
  patch: PATCH,
  delete: DELETE,
}

export default vercel
