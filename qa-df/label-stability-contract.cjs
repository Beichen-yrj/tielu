const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const source = fs.readFileSync(path.join(__dirname, '../src-df/60-data.js'), 'utf8')
const fn = source.slice(source.indexOf('function updateLabels(){'), source.indexOf('function updateHUD()'))
function fixture(width = 160, height = 73) {
  const attributes = {}, tag = { style: {}, setAttribute(k, v) { attributes[k] = v } }
  Object.defineProperties(tag, { offsetWidth: { get: () => tag.style.display === 'none' ? 0 : width }, offsetHeight: { get: () => tag.style.display === 'none' ? 0 : height } })
  const point = { x: 0, y: 1 - 228 / 300, z: 0, clone() { return { ...this, project() { return this } } } }
  const zone = { tag, anchor: point }
  const obstacle = { hidden: false, getBoundingClientRect: () => ({ left: 0, right: 1000, top: 0, bottom: 150 }) }
  const context = vm.createContext({ zones: [zone], camera: {}, innerWidth: 1000, innerHeight: 600, showLabels: true, hiddenUI: false,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1' }), document: { querySelectorAll: () => [obstacle] } })
  vm.runInContext(fn, context)
  return { zone, context, attributes, update: () => vm.runInContext('updateLabels()', context), visible: () => tag.style.display !== 'none' && tag.style.visibility !== 'hidden' }
}
// Reproduces the actual 73px label crossing a panel edge. display:none previously
// returned zero dimensions, so the next tick used 65px and displayed it again.
const edge = fixture(), samples = []
for (let i = 0; i < 20; i++) { edge.update(); samples.push(edge.visible()) }
assert.ok(samples.every(v => !v), 'An overlapping label must stay hidden instead of alternating every update')
assert.equal(edge.zone.tag.offsetHeight, 73, 'Hidden labels must retain their measured geometry')
edge.zone.anchor.y = 1 - 245 / 300; edge.update()
assert.equal(edge.visible(), true, 'Label reappears after moving clear of the panel')
for (const y of [233, 235, 232, 234, 233]) { edge.zone.anchor.y = 1 - y / 300; edge.update(); assert.equal(edge.visible(), true, 'Small edge movement must not toggle an already visible label') }
edge.zone.anchor.y = 1 - 228 / 300; edge.update(); assert.equal(edge.visible(), false)
edge.zone.anchor.y = 1 - 233 / 300; edge.update(); assert.equal(edge.visible(), false, 'A hidden label requires extra clearance before reappearing')
edge.zone.anchor.y = 1 - 245 / 300; edge.update(); assert.equal(edge.visible(), true)
vm.runInContext('showLabels=false', edge.context); edge.update(); assert.equal(edge.visible(), false)
vm.runInContext('showLabels=true;hiddenUI=true', edge.context); edge.update(); assert.equal(edge.visible(), false)
vm.runInContext('hiddenUI=false', edge.context); edge.update(); assert.equal(edge.visible(), true)
assert.equal(edge.attributes['aria-hidden'], 'false')
for (const [width, height] of [[145, 59], [160, 94]]) {
  const f = fixture(width, height); f.zone.anchor.y = 1 - (150 + 8 + height - 3) / 300
  const values = []; for (let i = 0; i < 20; i++) { f.update(); values.push(f.visible()) }
  assert.ok(values.every(v => !v), 'Responsive and wrapped labels must use their actual dimensions')
}
console.log('PASS: repeated panel-edge updates, retained hidden dimensions, visibility hysteresis, label/clean toggles, responsive and wrapped text')
