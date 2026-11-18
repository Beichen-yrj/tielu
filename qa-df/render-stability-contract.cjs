const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const read = name => fs.readFileSync(path.join(root, name), 'utf8')
// Exercise the actual rendering lifecycle without requiring a GPU driver.
for (const query of ['', '?lq=1', '?raw=1']) {
  const handlers = new Map(), renders = [], sizes = [], targets = []
  const status = { hidden: true, textContent: '' }
  const drawingContext = { createImageData: () => ({ data: new Uint8ClampedArray(256 * 256 * 4) }), putImageData() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {} }
  const canvas = { addEventListener: (name, fn) => handlers.set(name, fn) }
  const renderer = { shadowMap: {}, info: { render: { calls: 42, triangles: 100 } },
    setDrawingBufferSize: (...args) => sizes.push(args), setPixelRatio() {}, setSize() {},
    render: (...args) => renders.push(args), setRenderTarget: target => targets.push(target),
    getPixelRatio: () => 1, capabilities: {} }
  let environments = 0, disposed = 0
  const ctx = vm.createContext({ console, URLSearchParams, location: { search: query },
    document: { getElementById: id => id === 'scene' ? canvas : status, createElement: () => ({ getContext: () => drawingContext }) },
    innerWidth: 1920, innerHeight: 1080, devicePixelRatio: 2 })
  vm.runInContext(read('vendor/three.classic.js'), ctx)
  ctx.fakeRenderer = renderer
  ctx.makeEnvironment = () => { environments++; return { texture: {}, dispose() { disposed++ } } }
  vm.runInContext('THREE.WebGLRenderer=function(){return fakeRenderer};THREE.PMREMGenerator=function(){this.fromScene=makeEnvironment;this.dispose=()=>{}};', ctx)
  vm.runInContext(read('src-df/05-regions.js') + '\n' + read('src-df/10-util.js') + '\n' + read('src-df/20-studio.js') + '\n' + read('src-df/70-post.js'), ctx)
  assert.equal(typeof handlers.get('webglcontextlost'), 'function', 'A lost context must be handled and recoverable')
  const initialSizeCount = sizes.length
  vm.runInContext('resizeRenderer();resizeRenderer();renderFrame();renderFrame()', ctx)
  assert.equal(sizes.length, initialSizeCount, 'Repeated same-size events must not clear/reallocate the canvas')
  assert.equal(renders.length, 2, 'One scene render per frame, without a second full-screen HDR/MSAA pass')
  assert.equal(targets.length, 0)
  const [width, height, ratio] = sizes[0]
  assert.ok(width * height * ratio * ratio <= 2500001, 'Bound the drawing buffer on high-DPI screens')
  let prevented = false
  handlers.get('webglcontextlost')({ preventDefault() { prevented = true } })
  assert.ok(prevented)
  assert.equal(status.hidden, false)
  vm.runInContext('renderFrame()', ctx)
  assert.equal(renders.length, 2, 'Do not issue WebGL work while the context is lost')
  const previousEnvironments = environments
  handlers.get('webglcontextrestored')()
  assert.equal(environments, previousEnvironments + 1, 'Rebuild render-target environment after GPU resources are lost')
  assert.equal(disposed, 1)
  assert.equal(status.hidden, true)
  assert.equal(renders.length, 3, 'Restoration immediately redraws the scene')
  ctx.innerWidth = 1280; ctx.innerHeight = 720
  vm.runInContext('resizeRenderer();renderFrame()', ctx)
  assert.equal(sizes.length, initialSizeCount + 1)
  assert.equal(renders.length, 4)
  assert.equal(vm.runInContext('renderer.toneMappingExposure', ctx), 1, 'Exposure must not oscillate during recovery or resize')
}
console.log('PASS: single scene output, bounded buffers, no duplicate resize, lost-context suspension, rebuilt lighting environment and immediate recovery across default/lq/raw modes')
