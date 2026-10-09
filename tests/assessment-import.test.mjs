import assert from 'node:assert/strict'
import test from 'node:test'
import { registerHooks } from 'node:module'

registerHooks({ resolve(specifier, context, next) {
  try { return next(specifier, context) }
  catch (error) {
    if (error.code === 'ERR_MODULE_NOT_FOUND' && specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context)
    throw error
  }
} })
const { parseAssessmentRows } = await import('../src/assessmentImport.ts')
const { buildImportedRecord } = await import('../src/assessmentRecord.ts')
const { assessmentSignature, findDuplicateImportRows } = await import('../src/assessmentDuplicates.ts')
const { hazardCatalog } = await import('../src/hazardCatalog.ts')
const first = hazardCatalog[0], second = hazardCatalog[1]
const headers = ['任务名称','办理局','办理站','作业区域','危险货物','作业环节','指标维度','危险源编号','评估方式','检测数据名称','检测值/结论','确定性结论','静态风险等级','发生可能性L','后果严重度C','照片文件名','隐患描述','整改建议']
const row = (hazard, index) => [`任务${index}`,'北京局','丰台西站','检测区','航空煤油',hazard.stage,hazard.dimension,hazard.code,'动态',`检测${index}`,index,null,null,4,4,`照片${index}.jpg`,`隐患${index}`,`建议${index}`]

test('each imported row retains its own evidence fields and exact worksheet row', () => {
  const rows = parseAssessmentRows([['说明'],headers,row(first,1),[],row(second,2)])
  assert.equal(rows.length,2)
  assert.deepEqual(rows.map(r => [r.excelRow,r.finding,r.action,r.photoName]),[[3,'隐患1','建议1','照片1.jpg'],[5,'隐患2','建议2','照片2.jpg']])
  const records = rows.map((r,i) => buildImportedRecord({...r,photoData:`data:image/jpeg;base64,row${i}`},'安全员',`HA-test-${i}`,'2026/10/8 10:00:00'))
  assert.deepEqual(records.map(r => [r.finding,r.action,r.photo_name,r.photo_data]),[['隐患1','建议1','照片1.jpg','data:image/jpeg;base64,row0'],['隐患2','建议2','照片2.jpg','data:image/jpeg;base64,row1']])
  assert.notEqual(records[0].hazard_name,records[1].hazard_name)
})

test('blank explanations use only the current row to generate defaults, and never inherit photos', () => {
  const rows = parseAssessmentRows([headers,row(first,1),row(second,2)])
  const records = rows.map((r,i) => buildImportedRecord({...r,finding:'',action:'',photoName:'',photoData:''},'安全员',`HA-${i}`,'2026/10/8'))
  assert.match(records[0].finding,new RegExp(first.name))
  assert.match(records[1].finding,new RegExp(second.name))
  assert.ok(records[1].action.includes(second.name))
  assert.equal(records[1].photo_data,'')
  assert.notEqual(records[0].action,records[1].action)
})

test('old templates still import and static/dynamic mutually exclusive fields remain validated', () => {
  const rows = parseAssessmentRows([headers.slice(0,15),row(first,1).slice(0,15)])
  assert.equal(rows[0].finding,'')
  assert.equal(rows[0].photoName,'')
  const invalid = row(first,1); invalid[11]='不符合'
  assert.throws(() => parseAssessmentRows([headers,invalid]),/动态评估不能填写/)
})

const imported = (overrides = {}) => ({
  taskName: '航煤专项评估', bureau: '中国铁路北京局集团有限公司', station: '丰台西站', area: '检测区', cargo: '航空煤油', unNumber: 'UN1863',
  stage: first.stage, dimension: first.dimension, hazardCode: first.code, assessmentType: '动态', dataName: '检测值', measuredValue: '12', unit: '%LEL', standardValue: '≤10',
  staticResult: '', staticRisk: '一般', likelihood: 4, severity: 4, finding: '异常', action: '整改', photoName: '', photoData: '', ...overrides,
})
const existingRecord = buildImportedRecord(imported({ photoName: 'old.jpg', photoData: 'old-photo' }), '历史安全员', 'HA-old', '2026/10/8')

test('duplicate matching ignores id, timestamp, photos and workflow fields', () => {
  const changedMetadata = { ...existingRecord, id: 'HA-new', created_at: '2026/10/9', photo_name: 'new.jpg', photo_data: 'new-photo', status: '整改中' }
  assert.equal(assessmentSignature(imported()), assessmentSignature(changedMetadata))
  const result = findDuplicateImportRows([imported(), imported({ taskName: '另一项评估' })], [changedMetadata])
  assert.deepEqual(result.duplicateIndexes, [0])
  assert.deepEqual(result.existingIndexes, [0])
})

test('dynamic template defaults do not block duplicate detection on the first data row', () => {
  const templateRow = parseAssessmentRows([headers, row(first, 1)])[0]
  assert.equal(templateRow.staticResult, '符合')
  const existingDynamic = buildImportedRecord({ ...templateRow, staticResult: '', staticRisk: '一般' }, '历史安全员', 'HA-dynamic', '2026/10/8')
  const result = findDuplicateImportRows([templateRow], [existingDynamic])
  assert.deepEqual(result.duplicateIndexes, [0])
  assert.deepEqual(result.existingIndexes, [0])
})

test('static compliant assessments use the effective low risk regardless of template default', () => {
  const source = imported({ assessmentType: '静态', measuredValue: '符合', staticResult: '符合', staticRisk: '一般' })
  const record = buildImportedRecord(source, '历史安全员', 'HA-static', '2026/10/8')
  assert.equal(record.risk, '低')
  assert.deepEqual(findDuplicateImportRows([source], [record]).duplicateIndexes, [0])
})

test('changed measured result, dynamic score or static result is a new assessment', () => {
  const rows = [
    imported({ measuredValue: '13' }),
    imported({ likelihood: 3 }),
    imported({ staticResult: '不符合', assessmentType: '静态', measuredValue: '不符合' }),
  ]
  const result = findDuplicateImportRows(rows, [existingRecord])
  assert.deepEqual(result.duplicateIndexes, [])
})

test('duplicate rows inside one import are marked after the first row and skip preserves unique order', () => {
  const rows = [imported(), imported({ photoName: 'second.jpg' }), imported({ taskName: '唯一评估' })]
  const result = findDuplicateImportRows(rows, [])
  assert.deepEqual(result.duplicateIndexes, [1])
  assert.deepEqual(result.inFileIndexes, [1])
  assert.deepEqual(rows.filter((_, index) => !new Set(result.duplicateIndexes).has(index)).map((row) => row.taskName), ['航煤专项评估', '唯一评估'])
})
