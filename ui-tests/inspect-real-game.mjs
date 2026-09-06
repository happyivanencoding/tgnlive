import { readFile, mkdir, writeFile } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const manifest = JSON.parse(await readFile('artifacts/eval/integration-opening-v010b/manifest.json', 'utf8'));
await mkdir('artifacts/ui/real-readonly', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const result = { mode: 'real-persisted-game-readonly-browser', gameId: manifest.gameId, startedAt: new Date().toISOString(), checks: {}, errors: [] };
page.on('pageerror', e => result.errors.push(e.message));
try {
  await page.goto('http://127.0.0.1:4317', { waitUntil: 'networkidle' });
  await page.locator(`[data-game-id="${manifest.gameId}"]`).click();
  await page.locator('#narrative .turn-block').first().waitFor();
  result.checks.mobileFits = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  result.checks.choices = await page.locator('#suggested-actions button').count() === 3;
  result.paragraphs = await page.locator('#narrative .turn-block p').count();
  await page.screenshot({ path: 'artifacts/ui/real-readonly/mobile.png', fullPage: true });
  const before = await page.locator('#narrative').innerText();
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#narrative .turn-block').first().waitFor();
  result.checks.resumeExactProse = (await page.locator('#narrative').innerText()) === before;
  await page.setViewportSize({ width: 1365, height: 950 });
  await page.screenshot({ path: 'artifacts/ui/real-readonly/desktop.png', fullPage: true });
  await page.locator('#reader-toggle').click();
  result.checks.readerMode = await page.locator('body').evaluate(x => x.classList.contains('reader-mode'));
  await page.screenshot({ path: 'artifacts/ui/real-readonly/reader.png', fullPage: true });
  result.passed = Object.values(result.checks).every(Boolean) && result.errors.length === 0;
} catch (error) { result.error = error.message; result.passed = false; process.exitCode = 1; }
finally { result.endedAt = new Date().toISOString(); await writeFile('artifacts/ui/real-readonly/result.json', JSON.stringify(result, null, 2), 'utf8'); console.log(JSON.stringify(result)); await browser.close(); }
