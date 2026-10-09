import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessPage } from '../src/permissions.ts'

test('ordinary and legacy operator accounts can view dashboard, AI assistant, and profile only', () => {
  for (const role of ['ordinary', 'operator']) {
    for (const page of ['总览', 'AI助手', '个人中心']) assert.equal(canAccessPage(role, page), true)
    for (const page of ['风险评估', '历史评估', '隐患分析', '历史分析', '整改闭环', '基础资料']) {
      assert.equal(canAccessPage(role, page), false, `${role}: ${page}`)
    }
  }
})

test('project managers can rectify but cannot enter assessment or analysis pages', () => {
  assert.equal(canAccessPage('project_manager', '整改闭环'), true)
  assert.equal(canAccessPage('project_manager', 'AI助手'), true)
  for (const page of ['风险评估', '历史评估', '隐患分析', '历史分析']) assert.equal(canAccessPage('project_manager', page), false)
})

test('assessment and history access stays available to assessors; unknown roles fail closed', () => {
  for (const page of ['风险评估', '历史评估', '隐患分析', '历史分析']) {
    assert.equal(canAccessPage('safety_manager', page), true)
    assert.equal(canAccessPage('admin', page), true)
    assert.equal(canAccessPage('unknown-role', page), false)
  }
  assert.equal(canAccessPage('safety_manager', '整改闭环'), true)
  assert.equal(canAccessPage('admin', '整改闭环'), true)
})
