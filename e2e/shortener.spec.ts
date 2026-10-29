import { expect, test, type APIRequestContext } from '@playwright/test'

const todayUtc = () => new Date().toISOString().slice(0, 10)
const formatDay = (isoDay: string) => isoDay.split('-').reverse().join('/')

async function shorten(request: APIRequestContext, data: { url: string; expiresAt?: string }) {
  const res = await request.post('/api/shorten', { data })
  expect(res.status()).toBe(201)
  return (await res.json()) as { shortCode: string; shortUrl: string }
}

test('creates a short url in the UI, follows it and shows the click in list and analytics', async ({
  page,
  request,
}) => {
  const originalUrl = `https://example.com/e2e?run=${Date.now()}`

  // 1. Create through the form
  await page.goto('/')
  await page.getByLabel(/url original/i).fill(originalUrl)
  await page.getByRole('button', { name: /encurtar/i }).click()

  const status = page.getByRole('status')
  const shortLink = status.getByRole('link', { name: /^http/ })
  await expect(shortLink).toBeVisible()
  const shortUrl = (await shortLink.textContent())!.trim()
  const code = new URL(shortUrl).pathname.slice(1)
  expect(code).toMatch(/^[A-Za-z0-9]{7}$/)

  // 2. Short url redirects with 301 and records the click
  const redirect = await request.get(`/${code}`, {
    maxRedirects: 0,
    headers: { referer: 'https://referrer.example/', 'user-agent': 'E2E-Agent' },
  })
  expect(redirect.status()).toBe(301)
  expect(redirect.headers()['location']).toBe(originalUrl)

  // 3. Listing shows the url with one click
  await page.goto('/urls')
  const row = page.getByRole('table', { name: /urls encurtadas/i }).getByRole('row').filter({ hasText: code })
  await expect(row).toContainText(originalUrl)
  await expect(row.getByRole('link', { name: shortUrl, exact: true })).toHaveAttribute('href', shortUrl)
  await expect(row.getByRole('cell', { name: '1', exact: true })).toBeVisible()

  // 4. Analytics page shows totals, clicks by day and top referrers
  await row.getByRole('link', { name: /ver analytics/i }).click()
  await expect(page).toHaveURL(`/analytics/${code}`)
  await expect(page.getByTestId('total-clicks')).toHaveText('1')

  const byDay = page.getByRole('table', { name: /cliques por dia/i })
  await expect(byDay.getByRole('row')).toHaveCount(31) // header + 30 days
  await expect(byDay.getByRole('row').filter({ hasText: formatDay(todayUtc()) })).toContainText('1')

  const referrers = page.getByRole('table', { name: /top referrers/i })
  await expect(referrers.getByRole('row').filter({ hasText: 'https://referrer.example/' })).toContainText('1')
})

test('lists the most recent urls first', async ({ page, request }) => {
  const older = await shorten(request, { url: 'https://older.example.com/' })
  const newer = await shorten(request, { url: 'https://newer.example.com/' })

  await page.goto('/urls')
  const rows = page.getByRole('table', { name: /urls encurtadas/i }).getByRole('row')
  const texts = await rows.allTextContents()
  const newerIndex = texts.findIndex((t) => t.includes(newer.shortCode))
  const olderIndex = texts.findIndex((t) => t.includes(older.shortCode))

  expect(newerIndex).toBeGreaterThan(0)
  expect(newerIndex).toBeLessThan(olderIndex)
})

test('shows an accessible error for a non http(s) url', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel(/url original/i)
  await input.fill('ftp://example.com/file')
  await page.getByRole('button', { name: /encurtar/i }).click()

  await expect(page.getByRole('form', { name: /encurtar url/i }).getByRole('alert')).toContainText(
    /http:\/\/ ou https:\/\//i,
  )
  await expect(input).toHaveAttribute('aria-invalid', 'true')
})

test('API rejects invalid urls with 400', async ({ request }) => {
  const res = await request.post('/api/shorten', { data: { url: 'javascript:alert(1)' } })
  expect(res.status()).toBe(400)
})

test('unknown code returns 404', async ({ request }) => {
  const res = await request.get('/zzzzzzz', { maxRedirects: 0 })
  expect(res.status()).toBe(404)
})

test('expired code returns 410', async ({ request }) => {
  const { shortCode } = await shorten(request, {
    url: 'https://expiring.example.com/',
    expiresAt: new Date(Date.now() + 2_000).toISOString(),
  })

  expect((await request.get(`/${shortCode}`, { maxRedirects: 0 })).status()).toBe(301)
  await new Promise((r) => setTimeout(r, 2_500))
  expect((await request.get(`/${shortCode}`, { maxRedirects: 0 })).status()).toBe(410)
})

test('stats API returns totals, 30 days and top referrers', async ({ request }) => {
  const { shortCode } = await shorten(request, { url: 'https://stats.example.com/' })
  await request.get(`/${shortCode}`, { maxRedirects: 0, headers: { referer: 'https://a.example/' } })
  await request.get(`/${shortCode}`, { maxRedirects: 0 })

  const res = await request.get(`/api/stats/${shortCode}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body.totalClicks).toBe(2)
  expect(body.clicksByDay).toHaveLength(30)
  expect(body.clicksByDay.at(-1)).toEqual({ date: todayUtc(), count: 2 })
  expect(body.topReferrers).toEqual(
    expect.arrayContaining([
      { referrer: 'https://a.example/', count: 1 },
      { referrer: 'direct', count: 1 },
    ]),
  )
})

test('analytics page returns 404 for an unknown code', async ({ page }) => {
  const res = await page.goto('/analytics/zzzzzzz')
  expect(res?.status()).toBe(404)
})

test('the shorten flow works with the keyboard only', async ({ page }) => {
  await page.goto('/')
  const input = page.getByLabel(/url original/i)

  for (let i = 0; i < 10 && !(await input.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(input).toBeFocused()

  await page.keyboard.type(`https://keyboard.example.com/${Date.now()}`)
  await page.keyboard.press('Enter')

  await expect(page.getByRole('status').getByRole('link', { name: /^http/ })).toBeVisible()
})
