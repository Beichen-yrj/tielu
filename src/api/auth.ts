export type AuthUser = {
  id: number
  username: string
  display_name: string
  role: string
  created_at: string
}

type TokenResponse = {
  access_token: string
  token_type: string
  expires_in: number
  user: AuthUser
}

const tokenKey = 'rail-safety-access-token'
const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = window.sessionStorage.getItem(tokenKey)
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string | Array<{ msg?: string }> }
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail
    throw new ApiError(detail || '服务暂时不可用，请稍后重试', response.status)
  }
  return response.json() as Promise<T>
}

export function hasSession() {
  return Boolean(window.sessionStorage.getItem(tokenKey))
}

export async function register(username: string, password: string): Promise<AuthUser> {
  return request<AuthUser>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, display_name: username }),
  })
}

export async function login(username: string, password: string): Promise<AuthUser> {
  const result = await request<TokenResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  window.sessionStorage.setItem(tokenKey, result.access_token)
  return result.user
}

export function getCurrentUser(): Promise<AuthUser> {
  return request<AuthUser>('/auth/me')
}

export async function logout(): Promise<void> {
  try {
    if (hasSession()) await request<{ message: string }>('/auth/logout', { method: 'POST' })
  } finally {
    window.sessionStorage.removeItem(tokenKey)
  }
}

export function clearSession() {
  window.sessionStorage.removeItem(tokenKey)
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return request<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  })
}
