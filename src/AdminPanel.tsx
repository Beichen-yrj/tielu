import { useEffect, useState } from 'react'
import { Check, KeyRound, RefreshCw, Save, Settings, ShieldAlert, UserPlus, Users } from 'lucide-react'
import { ApiError } from './api/auth'
import { createAdminUser, getAiGlobalConfig, listAdminUsers, resetAdminPassword, saveAiGlobalConfig, updateAdminUser, type AdminUser, type AiGlobalConfig } from './api/admin'
import './AdminPanel.css'

const roles = { admin: '系统超级管理员', safety_manager: '安全管理员', project_manager: '项目经理', ordinary: '普通人员' } as const

export function AdminPanel({ onNotify, currentUserId }: { onNotify: (message: string) => void; currentUserId: number }) {
  const [tab, setTab] = useState<'users' | 'ai'>('users')
  const [users, setUsers] = useState<AdminUser[]>([])
  const [config, setConfig] = useState<AiGlobalConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [userForm, setUserForm] = useState({ username: '', display_name: '', password: '', role: 'ordinary' })
  const [aiForm, setAiForm] = useState({ api_key: '', base_url: '', model: '' })
  const [resetUser, setResetUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try { setUsers(await listAdminUsers()); setError('') } catch (err) { setError(err instanceof ApiError ? err.message : '账号列表加载失败') } finally { setLoading(false) }
  }
  const loadConfig = async () => {
    setLoading(true)
    try {
      const next = await getAiGlobalConfig()
      setConfig(next); setAiForm({ api_key: '', base_url: next.base_url, model: next.model }); setError('')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'AI 全局配置加载失败') } finally { setLoading(false) }
  }
  useEffect(() => {
    let cancelled = false
    void Promise.allSettled([listAdminUsers(), getAiGlobalConfig()]).then(([accounts, settings]) => {
      if (cancelled) return
      const errors: string[] = []
      if (accounts.status === 'fulfilled') setUsers(accounts.value)
      else errors.push(accounts.reason instanceof ApiError ? accounts.reason.message : '账号列表加载失败')
      if (settings.status === 'fulfilled') {
        setConfig(settings.value)
        setAiForm({ api_key: '', base_url: settings.value.base_url, model: settings.value.model })
      } else errors.push(settings.reason instanceof ApiError ? settings.reason.message : 'AI 全局配置加载失败')
      setError(errors.join('；'))
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault()
    if (userForm.password.length < 8) { setError('初始密码至少需要 8 位'); return }
    setBusy(true); setError('')
    try { await createAdminUser(userForm); setUserForm({ username: '', display_name: '', password: '', role: 'ordinary' }); await loadUsers(); onNotify('账号已创建') } catch (err) { setError(err instanceof ApiError ? err.message : '账号创建失败') } finally { setBusy(false) }
  }
  const patchUser = async (user: AdminUser, payload: { role?: string; is_active?: boolean }) => {
    setBusy(true); setError('')
    try { const updated = await updateAdminUser(user.id, payload); setUsers(list => list.map(item => item.id === updated.id ? updated : item)); onNotify('账号设置已更新') } catch (err) { setError(err instanceof ApiError ? err.message : '账号设置更新失败') } finally { setBusy(false) }
  }
  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!resetUser) return
    if (newPassword.length < 8) { setError('新密码至少需要 8 位'); return }
    setBusy(true); setError('')
    try {
      const result = await resetAdminPassword(resetUser.id, newPassword)
      setResetUser(null); setNewPassword(''); onNotify(result.message)
    } catch (err) { setError(err instanceof ApiError ? err.message : '密码重置失败') } finally { setBusy(false) }
  }
  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const next = await saveAiGlobalConfig({ api_key: aiForm.api_key || undefined, base_url: aiForm.base_url, model: aiForm.model })
      setConfig(next); setAiForm(form => ({ ...form, api_key: '' })); onNotify('AI 全局配置已保存，所有在线账号将使用新配置')
    } catch (err) { setError(err instanceof ApiError ? err.message : 'AI 全局配置保存失败') } finally { setBusy(false) }
  }
  const clearKey = async () => {
    if (!window.confirm('确定清除全平台 AI 密钥吗？清除后所有用户的在线 AI 将暂不可用。')) return
    setBusy(true); setError('')
    try { const next = await saveAiGlobalConfig({ clear_api_key: true, base_url: aiForm.base_url, model: aiForm.model }); setConfig(next); setAiForm(form => ({ ...form, api_key: '' })); onNotify('全局 AI 密钥已清除') } catch (err) { setError(err instanceof ApiError ? err.message : 'AI 密钥清除失败') } finally { setBusy(false) }
  }

  return <div className="content admin-page">
    <div className="page-heading"><div><div className="eyebrow">ADMINISTRATION · GLOBAL CONTROL</div><h1>平台管理</h1><p>管理全平台账号，并配置所有在线用户共用的智能体服务</p></div><div className="heading-actions"><button className="button secondary" onClick={() => { if (tab === 'users') void loadUsers(); else void loadConfig() }} disabled={loading || busy}><RefreshCw size={15} />刷新</button></div></div>
    <nav className="admin-tabs" aria-label="平台管理功能"><button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}><Users size={16} />全平台账号管理</button><button className={tab === 'ai' ? 'active' : ''} onClick={() => setTab('ai')}><Settings size={16} />智能体 API 全局配置</button></nav>
    {error && <p className="block-note admin-error"><ShieldAlert size={14} />{error}</p>}
    {tab === 'users' && <>
      <section className="panel admin-create-card"><div className="panel-title"><div><h2>新增平台账号</h2><p>可创建四类角色；账号创建后由服务端统一校验和保存</p></div><UserPlus size={18} /></div><form className="admin-create-form" onSubmit={createUser}><label>登录账号<input required minLength={2} maxLength={50} value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} /></label><label>显示名称<input required minLength={2} maxLength={50} value={userForm.display_name} onChange={e => setUserForm({ ...userForm, display_name: e.target.value })} /></label><label>初始密码<input required minLength={8} maxLength={128} autoComplete="new-password" type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></label><label>角色<select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><button className="button primary" disabled={busy || loading}><UserPlus size={15} />创建账号</button></form></section>
      <section className="panel"><div className="panel-title"><div><h2>全平台账号</h2><p>停用账号会立即撤销其现有登录会话；角色变更后需重新登录；不可停用或降级当前账号</p></div><strong className="admin-count">{users.length} 个账号</strong></div>{loading ? <p className="block-note">正在加载账号…</p> : <div className="table-scroll"><table className="check-table admin-users-table"><thead><tr><th>账号</th><th>角色</th><th>状态</th><th>创建时间</th><th>操作</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.display_name}</strong><small>{user.username} · ID {user.id}</small></td><td><select aria-label={`${user.username}的角色`} value={user.role === 'operator' ? 'ordinary' : user.role} disabled={busy || user.id === currentUserId} onChange={e => void patchUser(user, { role: e.target.value })}>{Object.entries(roles).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></td><td><button className={`admin-status ${user.is_active ? 'active' : ''}`} disabled={busy || user.id === currentUserId} onClick={() => void patchUser(user, { is_active: !user.is_active })}>{user.is_active ? '正常' : '已停用'}</button></td><td>{new Date(user.created_at).toLocaleString('zh-CN', { hour12: false })}</td><td><button className="row-action" disabled={busy} onClick={() => { setResetUser(user); setNewPassword(''); setError('') }}><KeyRound size={13} />重置密码</button></td></tr>)}</tbody></table></div>}</section>
    </>}
    {resetUser && tab === 'users' && <section className="panel admin-reset-card" aria-label="重置账号密码"><h2>重置“{resetUser.display_name}”的密码</h2><p>保存后该账号现有登录会话将失效，需要使用新密码重新登录。</p><form className="admin-reset-form" onSubmit={resetPassword}><label>新密码<input type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label><button className="button primary" disabled={busy}>确认重置</button><button type="button" className="button secondary" disabled={busy} onClick={() => { setResetUser(null); setNewPassword('') }}>取消</button></form></section>}
    {tab === 'ai' && <section className="panel admin-ai-card"><div className="panel-title"><div><h2>智能体 API 全局配置</h2><p>配置保存在服务端数据库，所有已登录用户的 AI 助手和情景助手统一读取；密钥不会回显</p></div><Settings size={18} /></div><div className={`admin-config-status ${config?.configured ? 'ready' : ''}`}><span>{loading ? '正在读取配置…' : !config ? '配置加载失败，请刷新重试' : config.configured ? '已配置，可供全平台使用' : '尚未配置在线 AI'}</span><small>当前来源：{config?.source || '读取中'} · {config?.api_key_masked || '未配置'}</small></div><form className="admin-ai-form" onSubmit={saveConfig}><label>API 密钥（留空表示保持现有密钥）<input type="password" autoComplete="new-password" value={aiForm.api_key} onChange={e => setAiForm({ ...aiForm, api_key: e.target.value })} placeholder={config?.configured ? '已配置，输入新密钥可替换' : '输入服务商 API 密钥'} /></label><label>接口地址（兼容 OpenAI Chat Completions）<input type="url" required value={aiForm.base_url} onChange={e => setAiForm({ ...aiForm, base_url: e.target.value })} placeholder="https://api.deepseek.com 或 https://服务商/v1" /></label><label>模型名称<input required value={aiForm.model} onChange={e => setAiForm({ ...aiForm, model: e.target.value })} placeholder="deepseek-chat" /></label><div className="admin-ai-actions"><button className="button primary" disabled={busy || loading || !config}><Save size={15} />保存全局配置</button><button type="button" className="button danger" disabled={busy || loading || !config?.configured} onClick={() => void clearKey()}>清除全局密钥</button></div></form><p className="report-note"><Check size={14} />保存后无需为每个账号重复配置。API 密钥仅用于后端请求，不会发送给普通用户；切换模型或接口地址会立即作用于后续 AI 请求。</p></section>}
  </div>
}
