import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
const root = path.dirname(fileURLToPath(import.meta.url))
const parts = ['05-regions','10-util','20-studio','30-building','40-process','45-logistics','50-assembly','55-rail-details','57-yard-context','58-dashboard-model','60-data','70-post','80-ui','85-scenario','90-boot']
let html = readFileSync(path.join(root, 'src-df/shell.html'), 'utf8')
html = html.replace('/* RAIL_THEME_INLINE */', () => ['theme.css','dashboard.css'].map(name => readFileSync(path.join(root, 'src-df', name), 'utf8')).join('\n'))
const vendor = readFileSync(path.join(root, 'vendor/three.classic.js'), 'utf8').replace(/console\.warn\('Scripts "build\/three\.js".*?\);/, '')
html = html.replace('/* THREE_INLINE */', () => '/*\n' + readFileSync(path.join(root,'vendor/THREE-LICENSE.txt'),'utf8') + '\n*/\n' + vendor.replace(/<\/script/gi, '<\\/script'))
html = html.replace('/* FACTORY_INLINE */', () => 'try {\n' + parts.map(p => readFileSync(path.join(root, `src-df/${p}.js`), 'utf8')).join('\n') + '\n} catch(error) { document.querySelector(".loading").style.display="none"; const panel=document.getElementById("error"); panel.hidden=false; panel.textContent="3D 场景启动失败。请使用支持 WebGL 的 Chrome / Edge，并启用图形加速。详细信息："+error.message; console.error(error); }')
mkdirSync(path.join(root, 'public'), { recursive: true })
for (const target of ['public/digital-factory-3d.html', '../digital-factory-3d.html']) writeFileSync(path.join(root, target), html)
console.log(`Built offline railway yard: ${(Buffer.byteLength(html)/1024).toFixed(0)} KB`)
