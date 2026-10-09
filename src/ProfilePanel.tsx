import { useEffect, useState } from 'react'
import { AlertTriangle, Camera, Check, KeyRound, LogOut, MessageSquare, RefreshCw, Send, Shield, ShieldCheck, Trash2, Upload, UserCircle } from 'lucide-react'
import { ApiError, changePassword, updateProfileAvatar } from './api/auth'
import { createFeedback, listFeedback, replyFeedback, type FeedbackItem } from './api/feedback'

export type ProfileStats = { pendingAssessments: number; pendingRectifications: number; closedRectifications: number; reports: number }

export function ProfilePanel({ userName, userRole, avatarData, stats, onAvatarChange, onLogout, onNotify, offline = false }: {
  userName: string
  userRole: string
  avatarData: string
  stats: ProfileStats
  onAvatarChange: (avatarData: string) => void
  onLogout: () => void
  onNotify: (message: string) => void
  offline?: boolean
}) {
  const isAdmin = userRole === 'admin'
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState('')

  const [form, setForm] = useState({ category: '功能建议', title: '', content: '' })
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({})

  const refresh = () => { setLoading(true); setReload((value) => value + 1) }

  useEffect(() => {
    if (offline) return
    let active = true
    listFeedback()
      .then((list) => { if (active) { setItems(list); setError('') } })
      .catch((err: unknown) => { if (active) setError(err instanceof ApiError ? err.message : '意见反馈服务暂时不可用') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload, offline])

  const myPending = items.filter((item) => item.status !== '已回复').length
  const roleLabel = ({ safety_manager: '安全管理员', project_manager: '项目经理', ordinary: '普通人员', operator: '普通人员', admin: '系统超级管理员' } as Record<string, string>)[userRole] || '平台用户'

  const saveAvatar = async (nextAvatar: string) => {
    setAvatarBusy(true)
    setAvatarMessage('')
    try {
      if (offline) {
        localStorage.setItem(`rail-avatar:${userName}`, nextAvatar)
        onAvatarChange(nextAvatar)
      } else {
        const updated = await updateProfileAvatar(nextAvatar)
        onAvatarChange(updated.avatar_data || '')
      }
      setAvatarMessage(nextAvatar ? '头像已更新' : '已恢复默认头像')
      onNotify(nextAvatar ? '头像已更新并同步到账号' : '已恢复默认头像')
    } catch (err) {
      setAvatarMessage(err instanceof ApiError ? err.message : '头像保存失败，请稍后重试')
    } finally {
      setAvatarBusy(false)
    }
  }

  const uploadAvatar = async (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setAvatarMessage('请选择 JPG、PNG 或 WebP 图片'); return }
    if (file.size > 10 * 1024 * 1024) { setAvatarMessage('原图不能超过 10MB'); return }
    try {
      await saveAvatar(await compressAvatar(file))
    } catch {
      setAvatarMessage('图片读取失败，请重新选择')
    }
  }

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.next.length < 8) { setPasswordMessage('新密码至少需要 8 位'); return }
    if (password.next !== password.confirm) { setPasswordMessage('两次输入的新密码不一致'); return }
    setSubmitting(true)
    try {
      const result = await changePassword(password.current, password.next)
      setPasswordMessage(result.message)
      setPassword({ current: '', next: '', confirm: '' })
      onNotify('密码已修改，其他登录会话已失效')
    } catch (err) {
      setPasswordMessage(err instanceof ApiError ? err.message : '修改失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const submitFeedback = async (event: React.FormEvent) => {
    event.preventDefault()
    if (form.title.trim().length < 2 || form.content.trim().length < 5) { onNotify('请填写标题（不少于 2 字）与内容（不少于 5 字）'); return }
    setSubmitting(true)
    try {
      await createFeedback({ category: form.category, title: form.title.trim(), content: form.content.trim() })
      setForm({ category: form.category, title: '', content: '' })
      refresh()
      onNotify('反馈已提交，管理员回复后可在此查看')
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '提交失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const sendReply = async (id: number) => {
    const text = (replyDraft[id] ?? '').trim()
    if (text.length < 2) { onNotify('请输入回复内容'); return }
    try {
      await replyFeedback(id, text)
      setReplyDraft((current) => ({ ...current, [id]: '' }))
      refresh()
      onNotify('回复已发送，提交人可在个人中心查看')
    } catch (err) {
      onNotify(err instanceof ApiError ? err.message : '回复失败，请稍后重试')
    }
  }

  return <div className="content">
    <div className="page-heading">
      <div>
        <div className="eyebrow">ACCOUNT · FEEDBACK</div>
        <h1>个人中心</h1>
        <p>维护账号安全、查看本人整改进度，并向管理员提交意见与问题反馈</p>
      </div>
      <div className="heading-actions"><button className="button secondary" onClick={onLogout}><LogOut size={16} />退出登录</button></div>
    </div>

    <section className="profile-grid profile-overview-grid">
      <article className="panel profile-card profile-identity-card">
        <div className="profile-identity">
          <div className={`profile-avatar ${avatarData ? 'has-image' : ''}`}>
            {avatarData ? <img src={avatarData} alt={`${userName}的头像`} /> : <span>{userName.slice(0, 1)}</span>}
            <label className="profile-avatar-edit" title="上传新头像"><Camera size={16} /><input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={avatarBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = '' }} /></label>
          </div>
          <div className="profile-identity-copy">
            <span className="profile-role-chip">{roleLabel}</span>
            <h2>{userName}</h2>
            <p>{isAdmin ? '负责平台账号、反馈与全局安全配置' : '维护个人资料并查看本人安全工作进度'}</p>
            <div className="profile-avatar-actions">
              <label className={`button secondary ${avatarBusy ? 'disabled' : ''}`}><Upload size={15} />{avatarBusy ? '处理中…' : '上传头像'}<input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={avatarBusy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadAvatar(file); event.currentTarget.value = '' }} /></label>
              {avatarData && <button className="button ghost" type="button" disabled={avatarBusy} onClick={() => void saveAvatar('')}><Trash2 size={15} />移除</button>}
            </div>
            <small>支持 JPG、PNG、WebP，原图不超过 10MB，保存时自动压缩</small>
            {avatarMessage && <p className="profile-message" role="status">{avatarMessage}</p>}
          </div>
        </div>
        <dl className="profile-facts">
          <div><dt>账号角色</dt><dd>{roleLabel}</dd></div>
          <div><dt>账号状态</dt><dd><i />正常</dd></div>
          <div><dt>数据范围</dt><dd>跟随当前统计范围</dd></div>
        </dl>
        <div className="profile-stats">
          <div><span>待完成评估</span><strong>{stats.pendingAssessments}</strong></div>
          <div><span>待整改</span><strong>{stats.pendingRectifications}</strong></div>
          <div><span>已闭环</span><strong>{stats.closedRectifications}</strong></div>
          <div><span>历史报告</span><strong>{stats.reports}</strong></div>
        </div>
        <p className="profile-data-note"><ShieldCheck size={13} />仅统计当前账号已经保存的评估、隐患和整改记录</p>
      </article>

      <article className="panel profile-security-card">
        <div className="panel-title"><div><h2>账号安全</h2><p>定期更新密码，修改后其他登录会话将自动失效</p></div><ShieldCheck size={18} /></div>
        <form className="profile-form" onSubmit={submitPassword}>
          <label><span>当前密码</span><input type="password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} placeholder="请输入当前密码" autoComplete="current-password" /></label>
          <div className="profile-password-row"><label><span>新密码</span><input type="password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} placeholder="至少 8 位" autoComplete="new-password" /></label><label><span>确认新密码</span><input type="password" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} placeholder="再次输入" autoComplete="new-password" /></label></div>
          {passwordMessage && <p className="profile-message">{passwordMessage}</p>}
          <button className="button primary" type="submit" disabled={submitting || offline}><KeyRound size={16} />{submitting ? '提交中…' : offline ? '离线模式不可用' : '更新密码'}</button>
        </form>
      </article>
    </section>

    <section className="panel feedback-panel">
      <div className="panel-title"><div><h2>{isAdmin ? '用户意见反馈（管理员视图）' : '意见反馈'}</h2><p>{isAdmin ? `共 ${items.length} 条，其中待回复 ${myPending} 条` : '提交后由管理员处理，回复内容会显示在下方列表'}</p></div><button className="row-action" onClick={() => refresh()} disabled={offline}><RefreshCw size={13} />刷新</button></div>

      {offline && <p className="block-note"><AlertTriangle size={14} />当前为离线演示模式（未连接后端服务）：登录、修改密码与意见反馈不可用，驾驶舱、风险评估、整改闭环、历史分析与基础资料可正常演示。</p>}
      {!offline && !isAdmin && <form className="profile-form feedback-form" onSubmit={submitFeedback}>
        <label><span>反馈类别</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['功能建议', '数据问题', '流程疑问', '界面体验', '其他'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>标题</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="一句话说明问题或建议" /></label>
        <label className="wide"><span>详细描述</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="描述使用场景、期望效果或发现的问题" rows={3} /></label>
        <button className="button primary" type="submit" disabled={submitting}><Send size={16} />提交反馈</button>
      </form>}

      {!offline && error && <p className="block-note"><AlertTriangle size={14} />{error}</p>}
      {!offline && loading && <p className="block-note">正在加载反馈记录…</p>}
      {!offline && !loading && !items.length && <div className="empty-state"><MessageSquare size={22} /><strong>暂无反馈记录</strong><span>{isAdmin ? '用户提交反馈后会显示在这里' : '可在上方提交反馈，管理员回复后会显示在此'}</span></div>}

      {!offline && !!items.length && <div className="feedback-list">{items.map((item) => <article className="feedback-item" key={item.id}>
        <div className="feedback-head">
          <span className={`feedback-status ${item.status === '已回复' ? 'done' : ''}`}>{item.status}</span>
          <strong>{item.title}</strong>
          <small>{item.category} · {isAdmin ? `${item.submitter}（${item.username}）` : '我提交的反馈'} · {item.created_at}</small>
        </div>
        <p className="feedback-content">{item.content}</p>
        {item.reply && <div className="feedback-reply"><span><ShieldCheck size={13} />{item.replied_by} · {item.replied_at}</span><p>{item.reply}</p></div>}
        {isAdmin && <div className="feedback-reply-form">
          <input value={replyDraft[item.id] ?? ''} onChange={(event) => setReplyDraft((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={item.reply ? '可补充新的处理说明' : '填写处理办法或答复'} />
          <button className="button secondary" onClick={() => sendReply(item.id)}><Check size={15} />{item.reply ? '更新回复' : '回复'}</button>
        </div>}
      </article>)}</div>}
    </section>

    <section className="panel">
      <div className="panel-title"><div><h2>账号与安全说明</h2><p>账号由 FastAPI 服务端管理，会话通过访问令牌校验</p></div></div>
      <ul className="report-issue-list">
        <li><UserCircle size={13} /> 修改密码后会撤销其他设备的登录会话，需要重新登录。</li>
        <li><Shield size={13} /> 管理员账号可查看全部用户反馈并给出处理意见，普通用户仅能看到本人提交的记录与回复。</li>
        <li><MessageSquare size={13} /> 反馈记录保存在服务端数据库，切换到其他账号仍可查看历史回复。</li>
      </ul>
    </section>
  </div>
}

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const image = new Image()
      image.onerror = reject
      image.onload = () => {
        const side = Math.min(image.width, image.height)
        const sourceX = (image.width - side) / 2
        const sourceY = (image.height - side) / 2
        const size = Math.min(512, side)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const context = canvas.getContext('2d')
        if (!context) { reject(new Error('无法处理图片')); return }
        context.drawImage(image, sourceX, sourceY, side, side, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}
