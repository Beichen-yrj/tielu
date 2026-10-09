import assert from 'node:assert/strict'
import test from 'node:test'
import { rectificationStatus, rectificationAccess, isOpenIssue, isActiveHazard } from '../src/rectificationWorkflow.ts'

const discovery = { operation: 'assessment', role: 'safety_manager', actor_id: 10 }
const assigned = { operation: 'advance', role: 'project_manager', actor_id: 20, actor: '经理甲', to_status: '整改中' }
test('original assessor and manager have distinct stages, including pending final confirmation', () => {
  const record = { user_id: 10, status: '待复核', rectification_log: [assigned, discovery] }
  assert.equal(rectificationAccess(record, 'safety_manager', 10).canProcess, true)
  assert.equal(rectificationAccess(record, 'safety_manager', 11).canProcess, true)
  assert.equal(rectificationAccess(record, 'project_manager', 20).canProcess, false)
  record.status = '待项目经理确认'
  assert.equal(rectificationAccess(record, 'project_manager', 20).canProcess, true)
  assert.equal(rectificationAccess(record, 'project_manager', 21).canProcess, false)
  assert.equal(rectificationAccess(record, 'safety_manager', 10).canProcess, false)
  assert.equal(rectificationAccess(record, 'project_manager', 20).index, 4)
  record.status = '已闭环'
  assert.equal(rectificationAccess(record, 'project_manager', 20).canProcess, false)
  assert.equal(rectificationAccess(record, 'project_manager', 20).index, 5)
})
test('only the last transition submitter can undo and legacy statuses map consistently', () => {
  const record = { user_id: 10, status: '待复核', rectification_log: [{ ...assigned, to_status: '待复核' }, assigned, discovery] }
  assert.equal(rectificationAccess(record, 'project_manager', 20).canWithdraw, true)
  assert.equal(rectificationAccess(record, 'safety_manager', 10).canWithdraw, false)
  assert.equal(rectificationStatus('已完成'), '待整改')
  assert.equal(rectificationStatus('已整改'), '已闭环')
})

test('closed hazards leave active lists while pending confirmation and withdrawn closure remain active', () => {
  const statuses = ['待整改', '整改中', '待复核', '复核中', '待项目经理确认', '已完成']
  for (const status of statuses) assert.equal(isActiveHazard({ has_hazard: true, status }), true)
  for (const status of ['已闭环', '已整改']) assert.equal(isActiveHazard({ has_hazard: true, status }), false)
  assert.equal(isActiveHazard({ has_hazard: false, status: '已完成' }), false)
  const issues = [{ stage: 0 }, { stage: 4 }, { stage: 5 }]
  assert.deepEqual(issues.filter(isOpenIssue), issues.slice(0, 2))
  issues[2].stage = 4
  assert.equal(issues.filter(isOpenIssue).length, 3)
})

test('only the current operator can edit their latest active-stage record', () => {
  const latest = { ...assigned, id: 'progress-1', operation: 'save_progress' }
  const record = { user_id: 10, status: '整改中', rectification_log: [latest, assigned, discovery] }
  assert.equal(rectificationAccess(record, 'project_manager', 20).editableEventId, 'progress-1')
  assert.equal(rectificationAccess(record, 'project_manager', 21).editableEventId, null)
  assert.equal(rectificationAccess(record, 'ordinary', 20).editableEventId, null)
  latest.operation = 'edit'
  assert.equal(rectificationAccess(record, 'project_manager', 20).editableEventId, 'progress-1')
  latest.operation = 'withdraw'
  assert.equal(rectificationAccess(record, 'project_manager', 20).editableEventId, null)
  latest.operation = 'save_progress'
  record.status = '待复核'
  assert.equal(rectificationAccess(record, 'project_manager', 20).editableEventId, null)
  assert.equal(rectificationAccess(record, 'safety_manager', 10).editableEventId, null)
  record.status = '已闭环'
  latest.to_status = '已闭环'
  assert.equal(rectificationAccess(record, 'project_manager', 20).editableEventId, null)
})
