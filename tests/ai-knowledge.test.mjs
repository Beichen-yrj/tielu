import assert from 'node:assert/strict'
import test from 'node:test'
import { answerQuickQuestion, getQuickQuestions } from '../src/aiKnowledge.ts'
import { canAccessPage } from '../src/permissions.ts'

const context = {
  records: [
    { task_name: '旧检测', created_at: '2026/10/07 10:00:00', assessment_type: '静态' },
    { task_name: '新检测', created_at: '2026/10/08 10:00:00', assessment_type: '动态', hazard_name: '检测报警仪', cargo: '煤油', station: '丰台西站', risk: '重大', score: 16, has_hazard: true, finding: '本条浓度异常', action: '本条排查措施' },
  ],
  issues: [
    { title: '浓度异常', risk: '重大', stage: 1, overdue: false },
    { title: '待复核设备', risk: '較大', stage: 2, overdue: false },
    { title: '已闭环重大隐患', risk: '重大', stage: 5, overdue: false },
  ],
}

test('all four roles have distinct local questions and AI access without new write permissions', () => {
  const groups = []
  for (const role of ['safety_manager', 'project_manager', 'ordinary', 'admin']) {
    assert.equal(canAccessPage(role, 'AI助手'), true)
    const questions = getQuickQuestions(role)
    assert.equal(questions.length, 4)
    for (const question of questions) assert.ok(answerQuickQuestion(role, question, context))
    groups.push(questions.join('|'))
  }
  assert.equal(new Set(groups).size, 4)
  assert.deepEqual(getQuickQuestions('operator'), getQuickQuestions('ordinary'))
  assert.deepEqual(getQuickQuestions('unknown'), [])
  assert.equal(answerQuickQuestion('unknown', '说明四类角色权限', context), undefined)
  assert.equal(answerQuickQuestion('ordinary', '分析最近一次评估', context), undefined)
  assert.equal(answerQuickQuestion('ordinary', '自由提问', context), undefined)
  assert.equal(canAccessPage('ordinary', '风险评估'), false)
  assert.equal(canAccessPage('ordinary', '整改闭环'), false)
  assert.equal(canAccessPage('project_manager', '风险评估'), false)
})

test('local answers use actual records, latest creation time and only open major issues', () => {
  const latest = answerQuickQuestion('safety_manager', '分析最近一次评估', context)
  assert.match(latest, /新检测/)
  assert.match(latest, /本条浓度异常/)
  assert.match(latest, /本条排查措施/)
  assert.doesNotMatch(latest, /旧检测/)
  const major = answerQuickQuestion('safety_manager', '汇总当前重大隐患', context)
  assert.match(major, /1 项未闭环/)
  assert.doesNotMatch(major, /已闭环重大隐患/)
  const progress = answerQuickQuestion('project_manager', '汇总整改闭环进度', context)
  assert.match(progress, /共 3 项隐患，未闭环 2 项、待复核 1 项/)
  const changed = { ...context, issues: context.issues.map(issue => ({ ...issue, stage: 5 })) }
  assert.match(answerQuickQuestion('project_manager', '汇总整改闭环进度', changed), /未闭环 0 项/)
})

test('matrix matches actual assessment thresholds and empty data does not fabricate results', () => {
  const answer = answerQuickQuestion('safety_manager', '说明风险矩阵口径', context)
  assert.match(answer, /R≥16/)
  assert.match(answer, /9≤R<16/)
  assert.match(answer, /4≤R<9/)
  assert.match(answer, /静态评估/)
  assert.match(answerQuickQuestion('safety_manager', '分析最近一次评估', { records: [], issues: [] }), /还没有评估记录/)
})
