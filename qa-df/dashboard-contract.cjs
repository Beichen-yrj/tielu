const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const ctx = vm.createContext({})
vm.runInContext("const riskLevels=['重大','较大','一般','低'];\n" + read('src-df/58-dashboard-model.js'), ctx)
const summarize = records => JSON.parse(vm.runInContext(`JSON.stringify(dashboardSummary(${JSON.stringify(records)}))`, ctx))
const empty = summarize([])
assert.equal(empty.closure, null)
assert.equal(empty.averageHours, null)
assert.deepEqual(empty.counts, [0, 0, 0, 0])
const created = '2026-11-17T00:00:00Z'
const records = [
  ...['待整改', '整改中', '待复核', '复核中', '待项目经理确认', '未知状态'].map((status, i) => ({ id: String(i), risk: '重大', hasHazard: true, status, measure: i < 2 ? ' 核查接地 ' : '', created, closedAt: '2026-11-17T12:00:00Z' })),
  { id: 'closed', risk: '较大', hasHazard: true, status: '已闭环', measure: '核查接地', created, closedAt: '2026-11-18T00:00:00Z' },
  { id: 'zero', risk: '一般', hasHazard: true, status: '已整改', measure: '更换密封', created, closedAt: created },
  { id: 'missing', risk: '低', hasHazard: true, status: '已闭环' },
  { id: 'negative', risk: '低', hasHazard: true, status: '已闭环', created, closedAt: '2026-11-16T00:00:00Z' },
  { id: 'invalid', risk: '低', hasHazard: true, status: '已闭环', created: 'unknown', closedAt: created },
  { id: 'no-hazard', risk: '低', hasHazard: false, status: '无隐患', measure: '不计入整改汇总' },
]
const original = JSON.stringify(records)
const result = summarize(records)
assert.equal(JSON.stringify(records), original)
assert.deepEqual(result.counts, [6, 1, 1, 4], 'Keep original grades, including closed assessments')
assert.equal(result.total, 12)
assert.equal(result.hazards, 11)
assert.equal(result.open, 6)
assert.equal(result.closed, 5)
assert.equal(result.closure, 45)
assert.deepEqual(result.stageCounts, [1, 1, 1, 1, 1, 5])
assert.equal(result.unknown, 1)
assert.equal(result.stageCounts.reduce((a, b) => a + b, 0) + result.unknown, result.hazards)
assert.equal(result.durationSamples, 2, 'Exclude missing, negative, invalid and reopened durations')
assert.equal(result.averageHours, 12, 'Preserve a valid zero-hour closure')
assert.equal(result.measures.length, 2)
assert.equal(result.measures[0].text, '核查接地')
assert.equal(result.measures[0].records.length, 3)
assert.equal(result.missingMeasures, 7)
assert.equal(summarize([records[11]]).closure, null)
function load(name, cache = {}) {
  if (cache[name]) return cache[name]
  const module = { exports: {} }; cache[name] = module.exports
  const js = ts.transpileModule(read(`src/${name}.ts`), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, require: n => n.startsWith('./') ? load(n.slice(2), cache) : require(n), console })
  return module.exports
}
const model = load('railScenario')
const source = { status: '已闭环', created_at: created, rectification_log: [
  { operation: 'advance', to_status: '已闭环', created_at: '2026-11-17T06:00:00Z' },
  { operation: 'edit', to_status: '已闭环', created_at: '2026-11-19T00:00:00Z' },
  { operation: 'advance', to_status: '已闭环', created_at: 'invalid' },
  { operation: 'advance', to_status: '已闭环', created_at: '2026-11-18T00:00:00Z' },
] }
const before = JSON.stringify(source)
assert.equal(model.sourceFromAssessment(source, 'synthetic').closedAt, '2026-11-18T00:00:00Z')
assert.equal(model.sourceFromAssessment({ ...source, status: '整改中' }, 'synthetic').closedAt, '')
assert.equal(model.sourceFromAssessment({ ...source, rectification_log: [] }, 'synthetic').closedAt, '')
assert.equal(JSON.stringify(source), before)
console.log('PASS: original grades, six disjoint stages, closure denominator, empty/unknown/zero, duration coverage, measure deduplication, immutable snapshots and final closure-log selection')
