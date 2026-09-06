import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const publicRoot = new URL('../public/', import.meta.url);
const game = {
  id:'fixture-game-1', name:'沈照微', title:'雾河残灯', version:2, createdAt:'2026-09-07T08:00:00Z', updatedAt:'2026-09-07T08:03:00Z',
  state:{ realm:{ name:'炼气三层', rank:3, progress:42 }, location:'雾河渡口', coins:12, inventory:[{ name:'裂纹青符', qty:1 }], relationships:[{ name:'陆青萝', role:'渡口药师', attitude:'戒备' }], goal:'在子时前找到失踪的船夫', power:{ id:'echo', name:'回响之印' }, turnNumber:1 },
  turns:[{ id:'turn-1', index:1, action:'查看河岸遗物', narrative:'雾河的水在夜色里沉得像一块墨。\n\n你在碎石间拾起半截湿透的青绳，指腹刚碰上去，旧日的哭喊便从绳结里漫了出来。', choices:[{ id:'c1', label:'循着哭喊走向芦苇荡' },{ id:'c2', label:'去问渡口药师陆青萝' },{ id:'c3', label:'将青绳交给巡河人' }], createdAt:'2026-09-07T08:02:00Z', chapterIndex:1 }]
};
const contentTypes = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://127.0.0.1').pathname;
  try { const file = path === '/' ? 'index.html' : path.slice(1); const body = await readFile(new URL(file, publicRoot)); response.writeHead(200, { 'content-type':contentTypes[extname(file)] || 'application/octet-stream' }); response.end(body); }
  catch { response.writeHead(404); response.end('not found'); }
});
await new Promise((resolve) => server.listen(4318, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE || undefined });
const page = await browser.newPage({ viewport:{ width:390, height:844 }, deviceScaleFactor:1 });
const completed = structuredClone(game);
completed.version = 3; completed.state.turnNumber = 2;
completed.turns.push({ id:'turn-2', index:2, action:'去问渡口药师陆青萝', narrative:'陆青萝没有立刻回答。她把药碾压在掌心，低声说船夫昨夜带走了一盏不该点的灯。', choices:[{ id:'c4', label:'追问那盏灯的来历' },{ id:'c5', label:'以青绳试探她' },{ id:'c6', label:'立刻赶去芦苇荡' }], createdAt:'2026-09-07T08:04:00Z', chapterIndex:1 });
await page.route('**/api/**', async (route) => {
  const path = new URL(route.request().url()).pathname;
  const json = (body) => route.fulfill({ contentType:'application/json', body:JSON.stringify(body) });
  if (path === '/api/health') return json({ ok:true, version:'fixture', provider:{ name:'Sol ACP', model:'gpt-5.6-terra', status:'ready' } });
  if (path === '/api/games' && route.request().method() === 'GET') return json({ games:[game] });
  if (path === '/api/worlds') return json({ worlds:[{ id:'mist-river', title:'雾河下游', subtitle:'灵舟断绝的边境', powers:[{ id:'echo', name:'回响之印', description:'听见物品最后的记忆。' },{ id:'debt', name:'命债簿', description:'记下一次代价，不能免除。' },{ id:'bone', name:'白骨行旅', description:'借用遗骸的最后一门技艺。' }] }] });
  if (path === '/api/games/fixture-game-1' && route.request().method() === 'GET') return json({ game });
  if (path === '/api/games/fixture-game-1/turns') return route.fulfill({ contentType:'text/event-stream', body:`event: stage\ndata: {"name":"narrator","status":"running","elapsedMs":12}\n\nevent: text\ndata: {"delta":"陆青萝抬起眼。"}\n\nevent: text\ndata: {"delta":" 她认出了你手里的青绳。"}\n\nevent: complete\ndata: ${JSON.stringify({ game:completed, turn:completed.turns[1], metrics:{ totalMs:34 } })}\n\n` });
  return route.fallback();
});
try {
  await page.goto('http://127.0.0.1:4318');
  await page.getByRole('button', { name:/开启新的命途/ }).click();
  await page.locator('#hero-name').fill('沈照微');
  await page.locator('#adult-confirmation').check();
  if (await page.locator('#create-game-button').isDisabled()) throw new Error('onboarding did not become valid with fixture world and power');
  await page.getByRole('button', { name:/返回书库/ }).click();
  await page.getByRole('button', { name:'继续阅读' }).click();
  await page.locator('#narrative').waitFor();
  await page.getByRole('button', { name:'状态' }).click();
  await page.locator('#status-drawer.open').waitFor();
  await page.locator('#drawer-scrim').click({ position:{ x:5, y:5 } });
  const mobileFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  if (!mobileFits) throw new Error('390px viewport has horizontal overflow');
  await page.screenshot({ path:'artifacts/ui/fixture-mobile.png', fullPage:true });
  await page.getByRole('button', { name:/去问渡口药师/ }).click();
  await page.getByText('本回合已写入正史。').waitFor();
  await page.setViewportSize({ width:1280, height:900 });
  await page.screenshot({ path:'artifacts/ui/fixture-desktop.png', fullPage:true });
  console.log('fixture UI checks passed');
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
