import { mkdir, writeFile } from 'node:fs/promises';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.TGN_TEST_BASE_URL || 'http://127.0.0.1:4317';
const output = 'artifacts/ui/mobile-v060/before';

await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.BROWSER_EXECUTABLE || undefined,
});
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const evidence = {
  mode: 'real-current-page-readonly-no-generation',
  base,
  capturedAt: new Date().toISOString(),
  viewport: { width: 390, height: 844 },
  requests: [],
  checks: {},
  issues: [],
};

page.on('request', (request) => {
  if (request.url().includes('/api/')) evidence.requests.push({ method: request.method(), url: request.url() });
});

try {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${output}/home-390.png`, fullPage: true });
  evidence.checks.homeHorizontalFit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  evidence.checks.heroViewportShare = await page.locator('.hero-copy').evaluate((node) => node.getBoundingClientRect().height / innerHeight);
  evidence.checks.visibleWorldCards = await page.locator('.world-card:visible').count();
  evidence.checks.visibleLibraryCards = await page.locator('[data-game-id]:visible').count();
  if (evidence.checks.heroViewportShare > 0.55) evidence.issues.push('首页首屏宣传区占用超过 55% 视口，发现与书架入口被推到下方。');
  if (evidence.checks.visibleWorldCards === 0) evidence.issues.push('首页没有可直接浏览或进入的世界卡片。');

  const firstGame = page.locator('[data-game-id]').first();
  if (await firstGame.count()) {
    evidence.gameId = await firstGame.getAttribute('data-game-id');
    await firstGame.click();
    await page.locator('#story-screen.active').waitFor();
    await page.screenshot({ path: `${output}/story-390.png`, fullPage: true });
    evidence.checks.storyHorizontalFit = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    evidence.checks.actionAreaInitiallyVisible = await page.locator('#action-area').evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.top < innerHeight && rect.bottom > 0;
    });
    evidence.checks.hasBackToLatest = await page.getByRole('button', { name: /回到最新/ }).count() > 0;
    evidence.checks.hasReadingSettings = await page.getByRole('button', { name: /阅读设置/ }).count() > 0;
    evidence.checks.hasDraft = await page.locator('#custom-action').evaluate((node) => Boolean(node.value));
    if (!evidence.checks.actionAreaInitiallyVisible) evidence.issues.push('进入旧存档时拇指操作区不在当前视口，需要长距离滚动。');
    if (!evidence.checks.hasBackToLatest) evidence.issues.push('阅读旧文时没有明确的回到最新入口。');
    if (!evidence.checks.hasReadingSettings) evidence.issues.push('缺少字号、行距等阅读设置。');
  } else {
    evidence.issues.push('当前真实网页没有可只读打开的已有存档。');
  }
  evidence.checks.noMutationRequests = evidence.requests.every((request) => request.method === 'GET');
  evidence.passed = evidence.checks.noMutationRequests;
} catch (error) {
  evidence.passed = false;
  evidence.error = error.message;
  process.exitCode = 1;
} finally {
  await writeFile(`${output}/evidence.json`, JSON.stringify(evidence, null, 2), 'utf8');
  console.log(JSON.stringify(evidence));
  await browser.close();
}
