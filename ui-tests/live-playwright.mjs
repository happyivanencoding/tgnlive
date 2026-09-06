import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const label = process.env.TGN_UI_LABEL || `live-${Date.now()}`;
if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(label)) throw new Error('Unsafe evidence label');
const output = path.join(ROOT, 'artifacts', 'ui', label);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, acceptDownloads: true });
const evidence = { label, mode: 'real-browser-real-api-no-route-stubs', startedAt: new Date().toISOString(), errors: [], requests: [], checks: {}, measuredTurns: [] };
page.on('pageerror', err => evidence.errors.push({ type: 'pageerror', message: err.message }));
page.on('requestfailed', req => evidence.errors.push({ type: 'requestfailed', url: req.url(), error: req.failure()?.errorText }));
page.on('request', req => { if (req.url().includes('/api/')) evidence.requests.push({ method: req.method(), url: req.url(), at: new Date().toISOString() }); });
await page.addInitScript(() => {
  window.__tgnPaint = { started: null, firstNarrative: null, lastNarrative: null };
  const originalFetch = window.fetch;
  window.fetch = function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    if (/\/turns$/.test(url || '') && args[1]?.method === 'POST') window.__tgnPaint = { started: performance.now(), firstNarrative: null, lastNarrative: null };
    return originalFetch.apply(this, args);
  };
  window.addEventListener('DOMContentLoaded', () => {
    new MutationObserver(() => {
      const p = document.querySelector('#provisional-turn p');
      const text = p?.textContent || '';
      if (window.__tgnPaint.started !== null && text.trim() && !text.includes('等待叙事首字') && window.__tgnPaint.firstNarrative === null) {
        requestAnimationFrame(() => { if (window.__tgnPaint.firstNarrative === null) window.__tgnPaint.firstNarrative = performance.now(); });
      }
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  });
});
async function waitCommit(minTurns) {
  await page.waitForFunction(n => {
    const error = document.querySelector('#turn-error')?.textContent?.trim();
    if (error) throw new Error(error);
    return document.querySelectorAll('#narrative .turn-block:not(.provisional)').length >= n && !document.querySelector('#provisional-turn');
  }, minTurns, { timeout: 240000 });
  const metrics = await page.evaluate(() => ({ ...window.__tgnPaint, settledAt: performance.now(), paragraphs: document.querySelectorAll('#narrative .turn-block p:not(.turn-meta)').length, choices: document.querySelectorAll('#suggested-actions button').length }));
  evidence.measuredTurns.push({ ...metrics, requestToFirstPaintMs: metrics.firstNarrative === null ? null : metrics.firstNarrative - metrics.started, requestToObservedCommitMs: metrics.settledAt - metrics.started });
}
try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('#new-game-button').click();
  await page.locator('#hero-name').fill('林照');
  await page.locator('input[name="power"]').last().check();
  await page.locator('#adult-confirmation').check();
  await page.screenshot({ path: path.join(output, 'onboarding-mobile.png'), fullPage: true });
  await page.locator('#create-game-button').click();
  await waitCommit(1);
  evidence.checks.threeChoicesAfterOpening = await page.locator('#suggested-actions button').count() === 3;
  evidence.checks.mobileNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await page.screenshot({ path: path.join(output, 'story-mobile.png'), fullPage: true });
  await page.locator('#custom-action').fill('我先不卷入药铺的争执，沿着药市外侧往河边走，看看封城后是否还有小船能离开。');
  await page.locator('#custom-action').press('Enter');
  await waitCommit(2);
  const proseBeforeReload = await page.locator('#narrative').innerText();
  await page.locator('#open-status').click();
  await page.locator('#status-drawer.open').waitFor();
  await page.screenshot({ path: path.join(output, 'status-mobile.png'), fullPage: true });
  await page.locator('#drawer-scrim').click({ position: { x: 2, y: 2 } });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#narrative .turn-block').first().waitFor();
  evidence.checks.reloadPreservesProse = (await page.locator('#narrative').innerText()) === proseBeforeReload;
  evidence.checks.twoAcceptedTurnsAfterReload = await page.locator('#narrative .turn-block:not(.provisional)').count() === 2;
  const downloadPromise = page.waitForEvent('download');
  await page.evaluate(() => window.tgnLive.download('md'));
  const download = await downloadPromise;
  await download.saveAs(path.join(output, 'browser-export.md'));
  evidence.checks.downloadSucceeded = !(await download.failure());
  await page.setViewportSize({ width: 1365, height: 950 });
  await page.screenshot({ path: path.join(output, 'story-desktop.png'), fullPage: true });
  await page.locator('#reader-toggle').click();
  evidence.checks.readerMode = await page.locator('body').evaluate(el => el.classList.contains('reader-mode'));
  await page.screenshot({ path: path.join(output, 'reader-desktop.png'), fullPage: true });
  evidence.checks.desktopNoHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const games = await (await fetch(`${base}/api/games`)).json();
  evidence.game = games.games.find(g => g.name === '林照');
  evidence.outcome = Object.values(evidence.checks).every(Boolean) && evidence.errors.length === 0 ? 'passed' : 'issues_found';
} catch (err) {
  evidence.outcome = 'failed';
  evidence.error = String(err.message || err);
  await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  evidence.endedAt = new Date().toISOString();
  evidence.limitations = ['Real Chrome DOM/rAF timing, not a physical Android keyboard test.', 'Two-turn UI test is not evidence of long-run retention.', 'No API response stubs or simulated model prose used.'];
  await writeFile(path.join(output, 'result.json'), JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify(evidence));
  await browser.close();
}
