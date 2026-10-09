import type { HazardAssessmentRecord, RiskLevel } from './api/hazardAssessments'

export type AiIssue = { title: string; risk: RiskLevel; stage: number; overdue: boolean }
export type AiKnowledgeContext = { records: HazardAssessmentRecord[]; issues: AiIssue[] }
type QuickQuestion = { question: string; answer: (context: AiKnowledgeContext) => string }

const majorSummary: QuickQuestion = {
  question: '汇总当前重大隐患',
  answer: ({ issues }) => {
    const major = issues.filter((issue) => issue.risk === '重大' && issue.stage < 5)
    return major.length ? `当前范围有 ${major.length} 项未闭环重大风险隐患：${major.slice(0, 5).map((issue) => issue.title).join('、')}${major.length > 5 ? '等' : ''}。请按现场预案落实临时管控，由安全专业人员确认处置措施和复核要求。` : '当前范围没有未闭环的重大风险隐患。这不代表现场不存在风险，仍需按检查计划复核。'
  },
}
const priority: QuickQuestion = {
  question: '给出整改优先级建议',
  answer: ({ issues }) => {
    const open = issues.filter((issue) => issue.stage < 5)
    return `当前范围有 ${open.length} 项未闭环隐患，其中重大 ${open.filter((issue) => issue.risk === '重大').length} 项、较大 ${open.filter((issue) => issue.risk === '较大').length} 项。优先处理重大风险与逾期任务，再处理较大风险及一般、低风险任务；每项措施应明确责任、期限并留存整改与复核证据。`
  },
}
const matrix: QuickQuestion = {
  question: '说明风险矩阵口径',
  answer: () => '当前平台动态评估采用 R=L×C，L（发生可能性）和 C（后果严重度）均为 1～5：R≥16 为重大，9≤R<16 为较大，4≤R<9 为一般，R<4 为低。静态评估按符合/不符合和人工选择的等级判定，不套用动态矩阵。以上为当前系统规则，不等同于法定标准，正式使用需业务负责人确认。',
}

const roleQuestions: Record<string, QuickQuestion[]> = {
  safety_manager: [majorSummary, {
    question: '分析最近一次评估',
    answer: ({ records }) => {
      const latest = [...records].sort((a, b) => b.created_at.localeCompare(a.created_at, 'zh-CN', { numeric: true }))[0]
      if (!latest) return '当前范围还没有评估记录。请在风险评估页录入检测数据和本条检测照片后生成报告。'
      return `最近评估为“${latest.task_name}”，危险源为“${latest.hazard_name}”，危险货物 ${latest.cargo}，场站 ${latest.station}。${latest.assessment_type}评估结论：${latest.risk}风险${latest.assessment_type === '动态' ? `（R=${latest.score}）` : `（${latest.static_result}）`}，${latest.has_hazard ? `存在隐患：${latest.finding}` : '未发现本项隐患'}。建议：${latest.action || '结合原始检测数据由安全专业人员复核'}。`
    },
  }, {
    question: '静态和动态评估怎么选择',
    answer: () => '有明确标准、可以直接判定符合或不符合的危险源使用静态评估，填写确定性结论；存在不确定性、需估计发生可能性与后果的危险源使用动态评估，填写 L 和 C。两类字段不要混填，每条评估分别保留检测数据、照片、隐患描述与措施。',
  }, matrix],
  project_manager: [priority, {
    question: '汇总整改闭环进度',
    answer: ({ issues }) => `当前范围共 ${issues.length} 项隐患，未闭环 ${issues.filter((issue) => issue.stage < 5).length} 项、待复核 ${issues.filter((issue) => issue.stage === 2).length} 项、复核中 ${issues.filter((issue) => issue.stage === 3).length} 项、待项目经理确认 ${issues.filter((issue) => issue.stage === 4).length} 项、已闭环 ${issues.filter((issue) => issue.stage === 5).length} 项。整改推进以台账中的实际状态为准，不能用 AI 回复代替复核或销号。`,
  }, {
    question: '整改复核需要哪些证据',
    answer: () => '建议核对原隐患与整改措施、整改前后照片、相关检测数据、责任人与完成时间，并留存复核结论。按“待整改→整改中→待复核→复核中→待项目经理确认→已闭环”依次推进，不跳过现场复核；复核由安全管理员或系统超级管理员填写检测数据、控制标准并上传照片，确认合格后交回原负责项目经理完成闭环。',
  }, {
    question: '项目经理可以操作哪些功能',
    answer: () => '项目经理可查看安全驾驶舱、在整改闭环中推进整改状态，并使用 AI 助手和个人中心；不能新建、修改或删除风险评估，不能通过 AI 获得评估权限。',
  }],
  ordinary: [{
    question: '发现危险货物异常怎么上报',
    answer: () => '发现泄漏、异常气味、包装破损或检测报警时，按现场预案停止相关作业、远离危险区域并立即通知现场负责人或安全管理员。安全条件允许时记录货物名称、UN 编号、场站位置、检测时间、数值和照片，不擅自接近泄漏源。由有权限人员录入评估；本助手不会代为提交隐患。',
  }, {
    question: '现场作业前需要检查什么',
    answer: () => '核对危险货物名称与 UN 编号、包装和标志、作业许可、防护用品、设备状态及监测报警设施；确认作业区域隔离、应急物资和人员分工。遇不符合要求或信息不明的情况先报告负责人，具体检查项目以岗位规程和货物安全资料为准。',
  }, {
    question: 'UN 编号有什么用途',
    answer: () => 'UN 编号是联合国危险货物识别编号，通常由 UN 加四位数字组成，用于核对运输名称、危险类别等资料。不能仅凭编号推断全部防护要求；请结合货物运输文件和安全技术说明书核实，新建评估页危险货物旁的问号可查询平台已收录的编号。',
  }, {
    question: '普通人员可以操作哪些功能',
    answer: () => '普通人员可查看安全驾驶舱中的风险信息，使用 AI 助手和个人中心；不能新建、修改、删除评估，也不能推进整改状态。现场异常请按单位流程通知安全管理员或项目经理。',
  }],
  admin: [{
    question: '汇总平台评估与隐患数据',
    answer: ({ records, issues }) => `当前范围共 ${records.length} 条评估，其中静态 ${records.filter((record) => record.assessment_type === '静态').length} 条、动态 ${records.filter((record) => record.assessment_type === '动态').length} 条；识别 ${issues.length} 项隐患，未闭环 ${issues.filter((issue) => issue.stage < 5).length} 项。统计基于当前加载的记录，不包含未保存的数据。`,
  }, {
    question: '说明四类角色权限',
    answer: () => '安全管理员负责风险评估、隐患分析及本人评估隐患的复核；项目经理负责整改状态推进；普通人员只读查看安全驾驶舱；系统超级管理员可管理评估、分析、整改及基础资料。四类角色均可使用 AI 和个人中心，超级管理员不提供公开注册。所有写操作仍由后端校验权限，AI 不会提升账号权限。',
  }, {
    question: '数据与权限巡检要注意什么',
    answer: () => '核对账号角色、后端接口权限、数据库备份与恢复、评估照片与记录对应关系、整改状态及异常日志。定期检查数据库和 AI 配置，但不要把密码、访问令牌、DeepSeek 密钥或人员敏感信息发到对话中。AI 只能提供检查建议，不会修改数据库或权限。',
  }, majorSummary],
}

export function getQuickQuestions(role: string): string[] {
  return (roleQuestions[role === 'operator' ? 'ordinary' : role] ?? []).map((item) => item.question)
}

export function answerQuickQuestion(role: string, question: string, context: AiKnowledgeContext): string | undefined {
  const query = question.trim()
  return roleQuestions[role === 'operator' ? 'ordinary' : role]?.find((item) => query === item.question || query.includes(item.question))?.answer(context)
}
