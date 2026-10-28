const assert = require('node:assert/strict')
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')

async function main() {
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {}) })
  const errors = []
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const page = await context.newPage()
    page.on('pageerror', (error) => errors.push(error.message))
    const images = []
    page.on('request', (request) => { if (request.resourceType() === 'image') images.push(request.url()) })
    await page.clock.install()
    await page.goto('http://127.0.0.1:4175/')
    const activeImage = page.locator('.portal-hero-media picture.active img')
    await activeImage.evaluate((img) => img.decode())
    assert.match(await activeImage.evaluate((img) => img.currentSrc), /hero-locomotive-960\.webp$/)

    // While the next slide is delayed, retain the decoded old image.
    let releaseImage
    const gate = new Promise((resolve) => { releaseImage = resolve })
    await page.route('**/hero-heavy-transport-960.webp', async (route) => { await gate; await route.continue() })
    const requestedImage = page.waitForRequest('**/hero-heavy-transport-960.webp')
    await page.getByRole('button', { name: '下一张图片' }).click()
    await requestedImage
    assert.match(await activeImage.evaluate((img) => img.currentSrc), /hero-locomotive-960\.webp$/)
    releaseImage()
    await page.waitForFunction(() => document.querySelector('.portal-hero-media picture.active img')?.currentSrc.includes('hero-heavy-transport-960'))
    await page.getByRole('button', { name: '下一张图片' }).click()
    await page.waitForFunction(() => document.querySelector('.portal-hero-media picture.active img')?.currentSrc.includes('hero-container-yard-960'))
    await activeImage.evaluate((img) => img.decode())
    assert.equal(await page.locator('.portal-hero-media picture').count(), 3)
    await page.screenshot({ path: 'logs/portal-mobile-hero.png' })

    // Once outside the viewport, advancing time must not change the slide.
    await page.evaluate(() => window.scrollTo(0, 1300))
    await page.clock.runFor(100)
    const before = await activeImage.evaluate((img) => img.currentSrc)
    await page.clock.runFor(19000)
    assert.equal(await activeImage.evaluate((img) => img.currentSrc), before)
    assert.ok(!images.some((url) => /\/portal\/.*\.jpg/.test(url)), 'Portal must use optimized renditions')
    assert.ok(!images.some((url) => /hero-.*-1600\.webp/.test(url)), 'Mobile must not download desktop hero images')
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true)
    await page.screenshot({ path: 'logs/portal-mobile-scroll.png' })

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.clock.runFor(100)
    await page.clock.runFor(6300)
    await page.waitForFunction(() => document.querySelector('.portal-hero-media picture.active img')?.currentSrc.includes('hero-locomotive-960'))

    // Loading failure must retain the last good slide.
    const failurePage = await context.newPage()
    await failurePage.route('**/hero-container-yard-960.webp', (route) => route.abort())
    await failurePage.goto('http://127.0.0.1:4175/')
    await failurePage.locator('.portal-hero-media picture.active img').evaluate((img) => img.decode())
    const failedRequest = failurePage.waitForEvent('requestfailed', (request) => request.url().includes('hero-container-yard-960'))
    await failurePage.getByRole('button', { name: /切换到第 3 张/ }).click()
    await failedRequest
    assert.match(await failurePage.locator('.portal-hero-media picture.active img').evaluate((img) => img.currentSrc), /hero-locomotive-960\.webp$/)
    await context.close()

    const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
    desktop.on('pageerror', (error) => errors.push(error.message))
    await desktop.clock.install()
    await desktop.goto('http://127.0.0.1:4175/')
    await desktop.locator('.portal-hero-media picture.active img').evaluate((img) => img.decode())
    assert.match(await desktop.locator('.portal-hero-media picture.active img').evaluate((img) => img.currentSrc), /hero-locomotive-1600\.webp$/)
    await desktop.clock.runFor(19000)
    assert.equal(await desktop.locator('.portal-hero-media picture').count(), 1)
    await desktop.getByRole('button', { name: '进入管理平台', exact: true }).first().click()
    await desktop.getByLabel('账号', { exact: true }).waitFor()
    assert.deepEqual(errors, [])
    console.log('PASS: mobile renditions, decoded switching, offscreen pause and resume, failed image fallback, desktop reduced motion, login entry')
  } finally {
    await browser.close()
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1 })
