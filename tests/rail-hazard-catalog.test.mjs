import assert from 'node:assert/strict'
import test from 'node:test'
import { classifyHazardIssue } from '../src/railHazardCatalog.ts'

test('隐患目录按人、物、环、管提炼问题对象', () => {
  assert.equal(classifyHazardIssue('', '穿戴劳动防护用品不到位', '人').kind, '人')
  assert.equal(classifyHazardIssue('', '危险品包装完整性不符合要求', '物').kind, '物')
  assert.equal(classifyHazardIssue('', '危险货物储存、装卸设施布局位置不合理', '环').kind, '环')
  assert.equal(classifyHazardIssue('', '安全制度完善性不足', '管').kind, '管')
})
