// Uses the temporary SQLite role fixture, never the application MySQL database.
const assert = require('node:assert/strict')
const { spawn } = require('node:child_process')
const path = require('node:path')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const root = path.resolve(__dirname, '..')
  const python = process.env.TEST_PYTHON || path.join(root, 'backend/.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python')
  const fixture = spawn(python, ['backend/tests/preview_permissions.py'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] })
  let fixtureLog = ''
  fixture.stdout.on('data', chunk => { fixtureLog += chunk })
  fixture.stderr.on('data', chunk => { fixtureLog += chunk })
  const base = process.env.TEST_FRONTEND_URL || 'http://127.0.0.1:5173'
  let browser
  try {
    for (let attempt = 0; ; attempt++) {
      if (fixture.exitCode !== null) throw new Error(fixtureLog)
      try { if ((await fetch('http://127.0.0.1:8001/api/health')).ok) break } catch {}
      if (attempt >= 50) throw new Error(`Isolated fixture did not start: ${fixtureLog}`)
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
    const errors = []
    const pages = {}
    for (const role of ['admin', 'safety_manager', 'project_manager', 'ordinary']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
      const page = await context.newPage()
      page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR:', error.message) })
      page.on('requestfailed', request => console.error('REQUEST FAILED:', new URL(request.url()).pathname, request.failure()?.errorText))
      page.on('response', response => { if (response.status() >= 400) console.error('HTTP ERROR:', response.status(), new URL(response.url()).pathname) })
      await page.route(url => url.pathname.startsWith('/api/'), async route => {
        const url = new URL(route.request().url())
        const response = await route.fetch({ url: `http://127.0.0.1:8001${url.pathname}${url.search}` })
        await route.fulfill({ response })
      })
      await page.goto(base)
      await page.getByRole('button', { name: '进入管理平台', exact: true }).first().click()
      await page.getByPlaceholder('请输入账号', { exact: true }).fill(`preview-${role}`)
      await page.getByPlaceholder('至少 8 位密码', { exact: true }).fill('preview123456')
      await page.getByRole('button', { name: '登录并进入平台' }).click()
      await page.locator('.main-nav').getByRole('button', { name: 'AI助手', exact: true }).click()
      await page.locator('.ai-chat-head').getByText('当前数据：1 份评估 · 1 项整改', { exact: true }).waitFor()
      pages[role] = page
    }
    const imported = await pages.admin.evaluate(async () => {
      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('rail-safety-access-token')}` }
      const records = await (await fetch('/api/hazard-assessments', { headers })).json()
      const record = { ...records[0], id: 'HA-SHARED-ADMIN-IMPORT', task_name: '管理员共享导入回归记录', status: '已完成' }
      const response = await fetch(`/api/hazard-assessments/${record.id}`, { method: 'PUT', headers, body: JSON.stringify(record) })
      return response.status
    })
    assert.equal(imported, 200)
    for (const page of Object.values(pages)) {
      await page.evaluate(() => window.dispatchEvent(new Event('focus')))
      await page.locator('.ai-chat-head').getByText('当前数据：2 份评估 · 2 项整改', { exact: true }).waitFor({ timeout: 5000 })
    }
    console.log('PASS: already-open sessions in all four roles refresh administrator-imported records on focus')

    // A failed list request must be visible on every page, with a working retry.
    const safety = pages.safety_manager
    await safety.route('**/api/hazard-assessments', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: '合成服务故障' }) }))
    await safety.evaluate(() => window.dispatchEvent(new Event('focus')))
    await safety.getByRole('alert').filter({ hasText: '合成服务故障' }).waitFor()
    await safety.unroute('**/api/hazard-assessments')
    await safety.getByRole('button', { name: '重试同步', exact: true }).click()
    await safety.locator('.data-sync-error').waitFor({ state: 'detached' })
    assert.deepEqual(errors, [])
    console.log('PASS: sync failures retain the previous snapshot, show the actual error and recover on retry')

    if (process.env.TEST_IMPORT_WORKBOOK) {
      const listRecords = page => page.evaluate(async () => {
        const response = await fetch('/api/hazard-assessments', { headers: { Authorization: `Bearer ${sessionStorage.getItem('rail-safety-access-token')}` } })
        if (!response.ok) throw new Error(`List failed: ${response.status}`)
        return response.json()
      })
      const importWorkbook = async page => {
        await page.locator('.main-nav').getByRole('button', { name: '风险评估', exact: true }).click()
        await page.getByRole('button', { name: '新建评估', exact: true }).click()
        await page.locator('.assessment-import-actions input[type=file]').setInputFiles(process.env.TEST_IMPORT_WORKBOOK)
        await page.waitForFunction(() => document.querySelectorAll('.batch-import-row').length === 10 || !!document.querySelector('.duplicate-import-modal') || (!!document.querySelector('.hazard-create-modal .auth-message') && !document.querySelector('.assessment-import-actions input[disabled]')))
        if (await page.locator('.duplicate-import-modal').count()) await page.getByRole('button', { name: '继续添加', exact: true }).click()
        const message = await page.locator('.hazard-create-modal .auth-message').textContent().catch(() => '')
        assert.equal(await page.locator('.batch-import-row').count(), 10, `Expected all workbook rows: ${message}`)
        assert.equal(await page.locator('.batch-import-row img').count(), 10, 'Every assessment must retain its embedded inspection photo')
      }
      await importWorkbook(safety)
      // Simulate a real mid-batch failure: only acknowledged rows may leave the editor.
      let writes = 0
      await safety.route('**/api/hazard-assessments/*', async route => {
        if (route.request().method() === 'PUT' && ++writes === 6) {
          await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: '合成第六条保存故障' }) })
        } else await route.fallback()
      })
      await safety.getByRole('button', { name: '生成评估结论', exact: true }).click()
      await safety.locator('.hazard-create-modal .auth-message').filter({ hasText: '已确认入库 5 条' }).waitFor()
      assert.equal(await safety.locator('.batch-import-row').count(), 5)
      assert.equal((await listRecords(safety)).length, 7)
      await safety.unroute('**/api/hazard-assessments/*')
      // The next request commits in the database but its success reply is lost.
      await safety.route('**/api/hazard-assessments/*', async route => {
        const response = await route.fetch({ url: `http://127.0.0.1:8001${new URL(route.request().url()).pathname}` })
        assert.equal(response.status(), 200)
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ detail: '合成保存回执丢失' }) })
      })
      await safety.getByRole('button', { name: '生成评估结论', exact: true }).click()
      await safety.locator('.hazard-create-modal .auth-message').filter({ hasText: '合成保存回执丢失' }).waitFor()
      assert.equal((await listRecords(safety)).length, 8)
      assert.equal(await safety.locator('.batch-import-row').count(), 5)
      await safety.unroute('**/api/hazard-assessments/*')
      await safety.getByRole('button', { name: '生成评估结论', exact: true }).click()
      await safety.locator('.hazard-create-modal').waitFor({ state: 'detached' })
      await safety.getByRole('button', { name: '关闭报告', exact: true }).click()
      let records = await listRecords(safety)
      assert.equal(records.length, 12)
      assert.equal(records.filter(record => record.has_hazard).length, 8)
      assert.equal(records.filter(record => record.photo_data?.startsWith('data:image/jpeg;base64,')).length, 10)
      assert.equal(records.filter(record => record.photo_name.includes('2 张合成')).length, 3, 'All three rows with two photos retain numbered evidence sheets')
      console.log('PASS: actual workbook imports all 10 assessments and photos; partial failure and lost success reply both retry without duplication')

      await pages.admin.evaluate(() => window.dispatchEvent(new Event('focus')))
      await pages.admin.locator('.ai-chat-head').getByText('当前数据：12 份评估 · 8 项整改', { exact: true }).waitFor()
      await importWorkbook(pages.admin)
      await pages.admin.getByRole('button', { name: '生成评估结论', exact: true }).click()
      await pages.admin.locator('.hazard-create-modal').waitFor({ state: 'detached' })
      records = await listRecords(pages.admin)
      assert.equal(records.length, 22)
      assert.equal(new Set(records.map(record => record.id)).size, 22)
      assert.equal(records.filter(record => record.has_hazard).length, 14)
      const expectedIds = records.map(record => record.id).sort()
      for (const [role, page] of Object.entries(pages)) {
        // Drop the token and reload to exercise an actual new login rather than cached state.
        await page.evaluate(() => { sessionStorage.clear(); localStorage.clear() })
        await page.reload()
        await page.getByRole('button', { name: '进入管理平台', exact: true }).first().click()
        await page.getByPlaceholder('请输入账号', { exact: true }).fill(`preview-${role}`)
        await page.getByPlaceholder('至少 8 位密码', { exact: true }).fill('preview123456')
        await page.getByRole('button', { name: '登录并进入平台' }).click()
        await page.locator('.main-nav').getByRole('button', { name: 'AI助手', exact: true }).click()
        await page.locator('.ai-chat-head').getByText('当前数据：22 份评估 · 14 项整改', { exact: true }).waitFor()
        assert.deepEqual((await listRecords(page)).map(record => record.id).sort(), expectedIds)
        if (role === 'project_manager') {
          await page.locator('.main-nav').getByRole('button', { name: '历史评估', exact: true }).click()
          assert.equal(await page.locator('.hazard-history-table tbody tr').count(), 22)
          assert.equal(await page.getByRole('button', { name: '新建评估', exact: true }).count(), 0)
          assert.equal(await page.getByRole('button', { name: '删除', exact: true }).count(), 0)
          await page.locator('.main-nav').getByRole('button', { name: /^整改闭环/ }).click()
          await page.getByRole('tab', { name: '待处理隐患（14）', exact: true }).waitFor()
        }
      }
      console.log('PASS: safety manager and administrator imports accumulate to 22; all roles retain the same IDs after fresh login; project manager sees all history and 14 hazards read-only')
    }
    assert.deepEqual(errors, [])
  } finally {
    if (browser) await browser.close()
    fixture.kill()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
