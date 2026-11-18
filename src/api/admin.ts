import { ApiError } from './auth'

export type AdminUser = {
  id: number
  username: string
  display_name: string
  avatar_data?: string | null
  role: string
  is_active: boolean
  created_at: string
}

export type AiGlobalConfig = {
  configured: boolean
  api_key_masked: string
  base_url: string
  model: string
  source: string
  updated_at?: string | null
}

const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = window.sessionStorage.getItem('rail-safety-access-token')
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { detail?: string | Array<{ msg?: string }> }
    const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail
    throw new ApiError(detail || '平台管理服务暂时不可用', response.status)
  }
  return response.json() as Promise<T>
}

export const listAdminUsers = () => request<AdminUser[]>('/admin/users')
export const createAdminUser = (payload: { username: string; display_name: string; password: string; role: string }) => request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
export const updateAdminUser = (id: number, payload: { display_name?: string; role?: string; is_active?: boolean }) => request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const resetAdminPassword = (id: number, newPassword: string) => request<{ message: string }>(`/admin/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ new_password: newPassword }) })
export const getAiGlobalConfig = () => request<AiGlobalConfig>('/admin/ai-config')
export const saveAiGlobalConfig = (payload: { api_key?: string; clear_api_key?: boolean; base_url?: string; model?: string }) => request<AiGlobalConfig>('/admin/ai-config', { method: 'PUT', body: JSON.stringify(payload) })
