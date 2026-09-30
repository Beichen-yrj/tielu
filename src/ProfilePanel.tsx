import { useEffect, useState } from 'react'
import { AlertTriangle, Check, KeyRound, LogOut, MessageSquare, RefreshCw, Send, Shield, ShieldCheck, UserCircle } from 'lucide-react'
import { ApiError, changePassword } from './api/auth'
import { createFeedback, listFeedback, replyFeedback, type FeedbackItem } from './api/feedback'

type IssueLike = { id: string; station: string; risk: string; stage: number; overdue: boolean; title: string }

export function ProfilePanel({ userName, userRole, records, issues, onLogout, onNotify }: {
  userName: string
  userRole: string
  records: Array<{ id: string; name: string; status: string; station: string }>
  issues: IssueLike[]
  onLogout: () => void
  onNotify: (message: string) => void
}) {
  const isAdmin = userRole === 'admin'
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const [password, setPassword] = useState({ current: '', next: '', confirm: '' })
  const [passwordMessage, setPasswordMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [form, setForm] = useState({ category: '功能建议', title: '', content: '' })
  const [replyDraft, setReplyDraft] = useState<Record<number, string>>({})

  const refresh = () => { setLoading(true); setReload((value) => value + 1) }

  useEffect(() => {
    let active = true
    listFeedback()
      .then((list) => { if (active) { setItems(list); setError('') } })
      .catch((err: unknown) => { if (active) setError(err instanceof ApiError ? err.message : '意见反馈服务暂时不可用') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [reload])

  const pending = records.filter((record) => record.status !== '已完成').length
  const open = issues.filter((issue) => issue.stage < 4).length
  const closed = issues.filter((issue) => issue.stage === 4).length
  const reports = records.filter((record) => record.status === '已完成').length
  const myPending = items.filter((item) => item.status !== '已回复').length

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

    <section className="profile-grid">
      <article className="panel profile-card">
        <div className="profile-card-head">
          <div className="avatar">{userName.slice(0, 1)}</div>
          <div>
            <strong>{userName}</strong>
            <span>{isAdmin ? '管理员账号 · 可查看并回复全部反馈' : '平台用户 · 可提交反馈并查看回复'}</span>
          </div>
        </div>
        <table className="facts-table"><tbody>
          <tr><th>账号角色</th><td>{isAdmin ? '管理员（admin）' : '业务用户（operator）'}</td></tr>
          <tr><th>账号状态</th><td>正常</td></tr>
          <tr><th>所属范围</th><td>当前统计范围由驾驶舱“统计范围”控制</td></tr>
        </tbody></table>
        <div className="profile-stats">
          <div><span>待完成评估</span><strong>{pending}</strong></div>
          <div><span>待整改</span><strong>{open}</strong></div>
          <div><span>已闭环</span><strong>{closed}</strong></div>
          <div><span>历史报告</span><strong>{reports}</strong></div>
        </div>
      </article>

      <article className="panel">
        <div className="panel-title"><div><h2>修改密码</h2><p>密码由服务端摘要存储，修改后其他登录会话将失效</p></div></div>
        <form className="profile-form" onSubmit={submitPassword}>
          <label><span>当前密码</span><input type="password" value={password.current} onChange={(event) => setPassword({ ...password, current: event.target.value })} placeholder="请输入当前密码" autoComplete="current-password" /></label>
          <label><span>新密码</span><input type="password" value={password.next} onChange={(event) => setPassword({ ...password, next: event.target.value })} placeholder="至少 8 位" autoComplete="new-password" /></label>
          <label><span>确认新密码</span><input type="password" value={password.confirm} onChange={(event) => setPassword({ ...password, confirm: event.target.value })} placeholder="再次输入新密码" autoComplete="new-password" /></label>
          {passwordMessage && <p className="profile-message">{passwordMessage}</p>}
          <button className="button primary" type="submit" disabled={submitting}><KeyRound size={16} />{submitting ? '提交中…' : '修改密码'}</button>
        </form>
      </article>
    </section>

    <section className="panel feedback-panel">
      <div className="panel-title"><div><h2>{isAdmin ? '用户意见反馈（管理员视图）' : '意见反馈'}</h2><p>{isAdmin ? `共 ${items.length} 条，其中待回复 ${myPending} 条` : '提交后由管理员处理，回复内容会显示在下方列表'}</p></div><button className="row-action" onClick={() => refresh()}><RefreshCw size={13} />刷新</button></div>

      {!isAdmin && <form className="profile-form feedback-form" onSubmit={submitFeedback}>
        <label><span>反馈类别</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{['功能建议', '数据问题', '流程疑问', '界面体验', '其他'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label><span>标题</span><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="一句话说明问题或建议" /></label>
        <label className="wide"><span>详细描述</span><textarea value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} placeholder="描述使用场景、期望效果或发现的问题" rows={3} /></label>
        <button className="button primary" type="submit" disabled={submitting}><Send size={16} />提交反馈</button>
      </form>}

      {error && <p className="block-note"><AlertTriangle size={14} />{error}</p>}
      {loading && <p className="block-note">正在加载反馈记录…</p>}
      {!loading && !items.length && <div className="empty-state"><MessageSquare size={22} /><strong>暂无反馈记录</strong><span>{isAdmin ? '用户提交反馈后会显示在这里' : '可在上方提交反馈，管理员回复后会显示在此'}</span></div>}

      {!!items.length && <div className="feedback-list">{items.map((item) => <article className="feedback-item" key={item.id}>
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
