const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
const codes = ['NE', 'NC', 'EC', 'SC', 'SW', 'NW']
const layouts = new Set()
for (const code of codes) {
  const context = vm.createContext({
    console: { ...console, warn() {} }, URLSearchParams,
    location: { search: '?region=' + code },
    document: { getElementById() {}, createElement() { return { getContext() { return { fillRect() {}, fillText() {}, measureText(text) { return { width: text.length * (parseFloat(this.font.split(' ')[1]) || 24) } } } } } } },
  })
  vm.runInContext(read('vendor/three.classic.js'), context)
  vm.runInContext(read('src-df/05-regions.js') + '\n' + read('src-df/10-util.js') + '\nconst scene=new THREE.Scene();', context)
  for (const name of ['30-building', '40-process', '45-logistics', '50-assembly', '55-rail-details', '57-yard-context']) vm.runInContext(read('src-df/' + name + '.js'), context)
  const contextClearance = JSON.parse(vm.runInContext(`JSON.stringify((()=>({
    buildings:yardContext.buildings.length,vehicles:yardContext.vehicles.length,
    roadClear:yardContext.buildings.every(b=>b.z-b.d/2>=64),
    railClear:yardContext.vehicles.every(v=>REGION.tracks.every(z=>Math.abs(z-v.z)>v.width/2+3)),
    sidingClear:yardContext.rollingStock.every(v=>v.z!==REGION.tracks[0]&&v.z!==tankTrack&&v.z!==goodsTrack),
    plantClear:yardContext.buildings.every(b=>yardContext.utility.filter(u=>u.type==='fire-water').every(u=>Math.abs(u.x-b.x)>=b.w/2+3||Math.abs(u.z-b.z)>=b.d/2+3))
  }))())`, context))
  assert.equal(contextClearance.buildings, 4)
  assert.equal(contextClearance.vehicles, 8)
  assert.ok(contextClearance.roadClear && contextClearance.railClear && contextClearance.plantClear && contextClearance.sidingClear, code + ': ancillary geometry must clear the service road, rails and tanks')
  const movement = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    const before=JSON.stringify(regionMetrics());
    updateMovement(0);const x0=anim.trains[0].group.position.x,w0=anim.trains[0].wheels[0].instanceMatrix.array[1],p0=anim.patrols[0].group.position.x;
    updateMovement(1);const x1=anim.trains[0].group.position.x,w1=anim.trains[0].wheels[0].instanceMatrix.array[1],p1=anim.patrols[0].group.position.x;
    const pose=()=>JSON.stringify(anim.patrols.map(p=>[p.group.position.toArray(),p.group.rotation.toArray(),p.limbs.map(l=>l.rotation.x)]));
    const first=pose();updateMovement(1);const repeat=pose();
    updateMovement(29.999);const beforeWrap=anim.trains[0].cars.every(c=>!c.visible);
    updateMovement(30);const afterWrap=anim.trains[0].cars.every(c=>!c.visible);
    let finite=true,clear=true;
    for(const t of[0,1,7,15,28,30,40,59.99,60,120,1000]){updateMovement(t);for(const p of anim.patrols){finite=finite&&p.group.position.toArray().concat(p.group.rotation.toArray().slice(0,3)).every(Number.isFinite);clear=clear&&REGION.tracks.every(z=>Math.abs(z-p.group.position.z)>2);}}
    const p=anim.patrols[0],checkpoint=patrolPose(p,Math.hypot(p.end[0]-p.start[0],p.end[1]-p.start[1])/p.speed+1-p.phase);
    return {x0,x1,w0,w1,p0,p1,repeated:first===repeat,beforeWrap,afterWrap,finite,clear,checkpoint,inspectors:anim.patrols.length,unchanged:before===JSON.stringify(regionMetrics())};
  })())`, context))
  assert.equal(movement.inspectors, 4)
  assert.equal(movement.x1 - movement.x0, 5, 'Train must travel continuously along the track')
  assert.notEqual(movement.w0, movement.w1, 'Train wheels must rotate')
  assert.ok(movement.p1 > movement.p0, 'Inspector must walk along the route')
  assert.equal(movement.checkpoint.checking, true, 'Inspector must stop at a checkpoint')
  assert.equal(movement.repeated, true, 'Frozen simulation time must freeze every patrol pose')
  assert.ok(movement.beforeWrap && movement.afterWrap, 'Train loop must reset entirely outside the visible yard')
  assert.ok(movement.finite && movement.clear, 'Patrol routes must remain finite and clear of the rails')
  assert.equal(movement.unchanged, true, 'Visual activity must not change risk or hazard statistics')
  const result = JSON.parse(vm.runInContext(`JSON.stringify((()=>{
    flush();scene.updateMatrixWorld(true);let invalid=false,meshes=0;
    scene.traverse(o=>{if(o.isMesh){meshes++;if(o.matrixWorld.elements.some(v=>!Number.isFinite(v)))invalid=true;const pos=o.geometry?.attributes.position;if(pos)for(const v of pos.array)if(!Number.isFinite(v))invalid=true;if(o.isInstancedMesh)for(const v of o.instanceMatrix.array)if(!Number.isFinite(v))invalid=true;}});
    return {id:REGION.id,metrics:regionMetrics(),riskIds:demoRisks.map(r=>r.id),hazards:demoHazards,positions:pointPositions,tracks:REGION.tracks,layout:[REGION.platformX,REGION.goodsX,REGION.tracks,REGION.roof,REGION.water,REGION.hills],invalid,meshes};
  })())`, context))
  assert.equal(result.id, code)
  assert.equal(result.invalid, false, code + ': non-finite geometry or transforms')
  assert.ok(result.meshes > 20, code + ': rolling stock and scene geometry exist')
  assert.equal(new Set(result.riskIds).size, 6)
  assert.equal(result.metrics.counts.reduce((a, b) => a + b, 0), 6)
  assert.equal(result.metrics.open, result.hazards.length)
  assert.equal(result.metrics.total, result.metrics.open + result.metrics.closed)
  assert.equal(result.metrics.closure, Math.round(result.metrics.closed / result.metrics.total * 100))
  assert.equal(result.metrics.review, result.hazards.filter(h => h.stage === '待复核').length)
  assert.ok(result.hazards.every(h => h.id.startsWith(code + '-') && h.zone >= 0 && h.zone < 6))
  // Loading platforms must sit clear of every track, not over the rolling stock.
  const tankZ = result.positions[1][1], goodsZ = result.positions[2][1]
  assert.ok(result.tracks.every(z => Math.abs(z - tankZ) >= 4), code + ': tank platform fouls a track')
  assert.ok(result.tracks.every(z => Math.abs(z - goodsZ) >= 5), code + ': goods platform fouls a track')
  layouts.add(JSON.stringify(result.layout))
}
assert.equal(layouts.size, 6, 'Region switch must change actual yard layouts')
const html = read('public/digital-factory-3d.html')
assert.equal(html, read('../digital-factory-3d.html'), 'Both offline entry files must match')
for (const match of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) new vm.Script(match[1])
console.log('PASS: six region geometries, clearances, train travel/wheels/off-stage loop, four inspector routes/checkpoints/frozen poses, record isolation and script syntax')
