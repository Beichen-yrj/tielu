const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const { unzipSync, strFromU8 } = require('fflate')
const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
function load(name, imports = {}) {
  const module = { exports: {} }
  const js = ts.transpileModule(read(`src/${name}.ts`), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText
  vm.runInNewContext(js, { module, exports: module.exports, require: n => imports[n] || (n.startsWith('./') ? load(n.slice(2), imports) : require(n)), atob, Uint8Array, console })
  return module.exports
}
const model = load('railScenario')
const exporter = load('sceneExport', { './railScenario': model })
const sourceRecord = {
  id: 'TEST-ONLY-01', task_name: '导出与映射合成算例', bureau: '测试局', station: '测试站', area: '栈台', cargo: '测试货物', un_number: '',
  risk: '较大', finding: '<script>alert(1)</script> & 接头异常', hazard_name: '连接检查', basis: '合成规则，不是真实标准', action: '检查连接并复核',
  data_name: '压力', measured_value: '0', unit: 'MPa', standard_value: '', status: '待整改', workflow_version: 3, photo_data: '', photo_name: '', created_at: '2026-11-17 10:00',
}
const before = JSON.stringify(sourceRecord)
const source = model.sourceFromAssessment(sourceRecord, '合成测试快照')
const d = model.sceneFromSource(source)
assert.equal(d.mappingConfirmed, true, 'Platform source mapping is derived automatically')
d.wind = '0'; d.temperature = ''; d.savedAt = '2026-11-17T02:00:00.000Z'
assert.equal(model.validateScene(d).length, 0)
const facts = new Map(model.sceneFacts(d))
assert.equal(facts.get('温度'), '未知')
assert.equal(facts.get('风速'), '0 m/s（演练假设）')
assert.match(facts.get('原检测数据'), /0MPa/)
d.causeConfirmed = true
assert.ok(model.validateScene(d).some(s => s.includes('原因')))
d.causeConfirmed = false
const imported = model.parseSceneFile(JSON.stringify(d))
assert.equal(imported.mappingConfirmed, false)
assert.match(imported.source.provenance, /文件导入快照/)
assert.throws(() => model.parseSceneFile(JSON.stringify({ ...d, region: '__proto__' })))
assert.throws(() => model.parseSceneFile(JSON.stringify({ ...d, annotation: { x: 1.1, y: 0, note: '错误' } })))
assert.equal(model.safePhoto('https://unknown.example/image.jpg'), '')
d.wind = '-1'; assert.ok(model.validateScene(d).length); d.wind = '0'
assert.equal(JSON.stringify(sourceRecord), before, 'Scene editing must never mutate the original record')
const output = path.join(root, 'qa-df/results')
fs.mkdirSync(output, { recursive: true })
for (const [ext, build] of [['docx', exporter.buildSceneDocument], ['xlsx', exporter.buildSceneWorkbook]]) {
  const bytes = build(d), zip = unzipSync(bytes)
  assert.ok(zip['[Content_Types].xml'])
  const xml = strFromU8(zip[ext === 'docx' ? 'word/document.xml' : 'xl/worksheets/sheet1.xml'])
  assert.match(xml, /&lt;script&gt;/)
  assert.ok(!xml.includes('<script>'))
  assert.match(xml, /未计算/)
  fs.writeFileSync(path.join(output, `scenario-contract.${ext}`), bytes)
}
// Exercise the real three.js scene and accident engine in all six region layouts.
for (const region of Object.keys(model.sceneRegions)) {
  const nodes = new Map(), handlers = []
  const node = id => { if (!nodes.has(id)) nodes.set(id, { textContent: '', classList: { add() {}, remove() {} } }); return nodes.get(id) }
  const context = vm.createContext({ console: { ...console, warn() {} }, URLSearchParams, location: { search: `?scenario=1&region=${region}`, origin: 'http://localhost' },
    document: { getElementById: node, body: { classList: { add() {} } }, addEventListener() {}, createElement() { return { getContext() { return { fillRect() {}, fillText() {}, measureText(t) { return { width: t.length * 100 } } } } } } },
    window: { parent: { postMessage() {} }, addEventListener(type, handler) { if (type === 'message') handlers.push(handler) } },
  })
  vm.runInContext(read('vendor/three.classic.js'), context)
  vm.runInContext(read('src-df/05-regions.js') + '\n' + read('src-df/10-util.js') + '\nconst scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera();let view={},transition=null;function stopTour(){}function applyCamera(){}', context)
  for (const part of ['30-building', '40-process', '45-logistics', '50-assembly', '55-rail-details', '57-yard-context', '85-scenario']) vm.runInContext(read(`src-df/${part}.js`), context)
  for (const zone of Object.keys(model.sceneObjects)) for (const event of Object.keys(model.sceneEvents)) {
    const result = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
      const before=JSON.stringify(regionMetrics());configureAccident({region:'${region}',zone:'${zone}',event:'${event}',problem:'合成演练',material:'${event === 'dispersion' ? 'toxic_gas' : 'flammable_liquid'}',ignition:true,accumulation:true,wind:3,direction:90,release:'jet'});
      const poses=[];for(const t of[0,6,12,15.5,18,24]){accident.time=t;updateAccident(0);poses.push({t,stage:accident.stage,gas:gas.visible,flames:flames.visible,flash:flash.visible,pool:pool.visible});}
      accident.time=0;accident.playing=true;updateAccident(1);const advanced=accident.time;accident.playing=false;updateAccident(1);const paused=accident.time;
      accident.time=23.9;accident.playing=true;updateAccident(1);
      return {poses,advanced,paused,ended:accident.time===24&&!accident.playing,finite:[...gas.instanceMatrix.array,...flames.instanceMatrix.array].every(Number.isFinite),unchanged:before===JSON.stringify(regionMetrics())};
    })())`, context))
    assert.deepEqual(result.poses.map(p => p.stage), [0, 1, 2, 2, 3, 3])
    assert.equal(result.poses[0].gas, false)
    assert.equal(result.poses[3].gas, !['control','leak'].includes(event))
    assert.equal(result.poses[3].pool, event !== 'control' && event !== 'dispersion')
    assert.equal(result.poses[3].flames, ['fire','explosion'].includes(event))
    assert.equal(result.poses[3].flash, event === 'explosion')
    assert.equal(result.advanced, 1); assert.equal(result.paused, 1)
    assert.ok(result.finite && result.unchanged && result.ended)
  }
  const physics = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const config={region:REGION.id,zone:'Z02',event:'dispersion',material:'toxic_gas',wind:4,release:'jet'};
    const mean=()=>{let x=0,z=0;for(let i=0;i<180;i++){x+=gas.instanceMatrix.array[i*16+12];z+=gas.instanceMatrix.array[i*16+14];}return[x/180,z/180]};
    configureAccident({...config,direction:90});accident.time=16;updateAccident(0);const east=mean();const first=Array.from(gas.instanceMatrix.array);updateAccident(0);const repeat=first.every((v,i)=>v===gas.instanceMatrix.array[i]);
    configureAccident({...config,direction:270});accident.time=16;updateAccident(0);const west=mean();
    configureAccident({...config,wind:0,direction:90});accident.time=16;updateAccident(0);const calm=mean();
    accident.active=false;configureAccident({...config,event:'fire',ignition:true});const toxicRejected=!accident.active;
    configureAccident({...config,event:'explosion',material:'flammable_gas',ignition:true,accumulation:false});const blastRejected=!accident.active;
    return {east,west,calm,repeat,toxicRejected,blastRejected,connections:infrastructure.connections.length,detectors:infrastructure.detectors.length};
  })())`, context))
  assert.ok(physics.east[0] < -1 && physics.west[0] > 1 && Math.abs(physics.calm[0]) < 1)
  assert.ok(physics.repeat && physics.toxicRejected && physics.blastRejected)
  assert.equal(physics.connections, 4); assert.equal(physics.detectors, 4)
  const messageHandler = handlers[0]
  messageHandler({ source: {}, origin: 'http://evil', data: { type: 'rail-scene-command', command: 'restart' } })
  assert.equal(vm.runInContext('accident.playing', context), false, 'Untrusted messages must not control the simulation')
}
console.log('PASS: immutable source, explicit mapping, import validation, unknown/zero, native Office packages, six regions × three objects × five hazard-conditioned scenarios, stages/play/pause/end and message boundary')

const hazard = load('railHazardModel')
assert.equal(hazard.inferMaterial('液氯','UN1017'),'toxic_gas')
assert.equal(hazard.inferMaterial('盐酸','UN1789'),'corrosive_liquid')
assert.equal(hazard.adviseScenario({...model.emptyScene(),source:{...source,dimension:'管',risk:'重大'},problem:'培训记录缺项'}).event,'control')
assert.ok(hazard.scenarioConditions({...model.demoScene(),event:'explosion'}).length>=2)
assert.equal(hazard.sceneEngineConfig({...model.demoScene(),wind:'0',direction:'0'}).wind,0)
assert.equal(hazard.sceneEngineConfig(model.demoScene()).wind,null)
console.log('PASS: hazard advice, toxic/corrosive classification, ignition gates, wind/zero/unknown, deterministic particle seek and detailed equipment')

// Platform mode must never substitute the standalone teaching records, even when empty.
const platformContext = vm.createContext({ URLSearchParams, location: { search: '?platform=1' } })
vm.runInContext(read('src-df/05-regions.js'), platformContext)
const platformMetrics = () => JSON.parse(vm.runInContext('JSON.stringify(regionMetrics())', platformContext))
assert.equal(platformMetrics().open, 0)
assert.equal(platformMetrics().closure, null)
assert.equal(platformMetrics().counts.reduce((a, b) => a + b, 0), 0)
vm.runInContext(`platformRecords=[
  {id:'SYNTHETIC-A',risk:'重大',hasHazard:true,status:'待整改'},
  {id:'SYNTHETIC-B',risk:'一般',hasHazard:true,status:'已闭环'},
  {id:'SYNTHETIC-C',risk:'低',hasHazard:false,status:'无隐患'},
  {id:'SYNTHETIC-D',risk:'较大',hasHazard:true,status:'复核中'}
]`, platformContext)
assert.deepEqual(platformMetrics(), { counts: [1, 1, 1, 1], open: 2, overdue: null, review: 1, closed: 1, total: 3, closure: 33 })
assert.equal(hazard.platformSceneRecord({...source,hasHazard:true},model.emptyScene()).hasHazard,true)
console.log('PASS: platform empty-state isolation, original grades/statuses, closed/open/review counts and unknown deadlines')
