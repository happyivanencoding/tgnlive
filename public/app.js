const API = '/api';
const storageKey = 'tgn-live-ui-v1';

const app = {
  health: null,
  worlds: [],
  games: [],
  game: null,
  turn: null,
  stream: null,
  pendingAction: null,
  lastMetrics: null,
  events: [],
  startedAt: null,
  timer: null,
  activeDrawer: null,
};

const $ = (selector) => document.querySelector(selector);
const els = {
  library: $('#library-screen'), onboarding: $('#onboarding-screen'), story: $('#story-screen'),
  provider: $('#provider-chip'), libraryList: $('#library-list'), gameCount: $('#game-count'),
  creationForm: $('#creation-form'), heroName: $('#hero-name'), worldPicker: $('#world-picker'), worldOptions: $('#world-options'),
  powerPicker: $('#power-picker'), powerOptions: $('#power-options'), adult: $('#adult-confirmation'), create: $('#create-game-button'), creationError: $('#creation-error'),
  storyTitle: $('#story-title'), storyLocation: $('#story-location'), narrative: $('#narrative'), statusRail: $('#status-rail'),
  statusDrawer: $('#status-drawer'), drawerScrim: $('#drawer-scrim'), observability: $('#observability-panel'), generation: $('#generation-status'),
  suggestions: $('#suggested-actions'), actionForm: $('#action-form'), customAction: $('#custom-action'), submitAction: $('#submit-action'),
  turnError: $('#turn-error'), retryRow: $('#retry-row'), retry: $('#retry-turn'), turnCounter: $('#turn-counter'), reader: $('#reader-toggle'),
  openStatus: $('#open-status'), openObservability: $('#open-observability'), exportMenu: $('#export-menu'), exportOptions: $('#export-options'),
};

function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[character])); }
function safeArray(value) { return Array.isArray(value) ? value : []; }
function formatDate(value) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '时间未记录' : new Intl.DateTimeFormat('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(date); }
function formatElapsed(milliseconds) { const seconds = Math.max(0, Math.floor(milliseconds / 1000)); return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function turnText(turn) { return turn?.narrative || turn?.text || ''; }
function saveSession() { localStorage.setItem(storageKey, JSON.stringify({ gameId: app.game?.id || null, pendingAction: app.pendingAction })); }
function readSession() { try { return JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { return {}; } }
function requestId() { return globalThis.crypto?.randomUUID?.() || `ui-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

function checkLogin(response, expectedType) {
  const type = response.headers.get('content-type') || '';
  if (response.status === 401 || response.status === 403 || response.redirected || type.includes('text/html')) {
    document.querySelector('#connection-notice').hidden = false;
    throw new Error('登录已过期，请点击“重新连接 / 登录”，然后核对存档再继续。');
  }
  if (response.ok && !type.includes(expectedType)) throw new Error('服务响应异常，请稍后重新连接。');
}
async function fetchJson(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { Accept:'application/json', ...(options.headers || {}) }, ...options });
  checkLogin(response, 'application/json');
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  if (!response.ok) throw Object.assign(new Error(payload.message || `请求失败（${response.status}）`), { status: response.status, payload });
  return payload;
}

function showScreen(name) {
  for (const element of [els.library, els.onboarding, els.story]) { const active = element.id === `${name}-screen`; element.hidden = !active; element.classList.toggle('active', active); }
  document.body.classList.remove('reader-mode');
  closeDrawer();
  requestAnimationFrame(() => $('#main-content').focus({ preventScroll: true }));
}
function toast(message) { const node = document.createElement('p'); node.className = 'toast'; node.textContent = message; $('#toast-region').replaceChildren(node); setTimeout(() => node.remove(), 4200); }
function record(name, details = '') { app.events.unshift({ name, details, at: new Date().toISOString() }); app.events = app.events.slice(0, 40); renderObservability(); }
function setProvider(health) {
  const provider = health?.provider;
  if (!provider) { els.provider.textContent = '私人原型 · 服务未连接'; els.provider.className = 'provider-chip error'; return; }
  const status = provider.status || 'unknown';
  const label = `${provider.name || 'ACP'} · ${provider.model || '未报告模型'} · ${status}`;
  els.provider.textContent = `AI 生成 · 私人 · ${label}`;
  els.provider.className = `provider-chip ${health.ok ? 'ok' : 'error'}`;
  els.provider.title = provider.warning || label;
}
async function refreshHealth() {
  try { app.health = await fetchJson('/health'); setProvider(app.health); record('health', `ok=${app.health.ok}`); }
  catch (error) { setProvider(null); record('health-error', error.message); }
}
async function refreshLibrary() {
  try { const payload = await fetchJson('/games'); app.games = safeArray(payload.games); renderLibrary(); }
  catch (error) { app.games = []; els.libraryList.innerHTML = `<p class="empty-state">书库暂不可读取：${escapeHtml(error.message)}。服务恢复后可刷新页面。</p>`; els.gameCount.textContent = ''; record('games-error', error.message); }
}
async function refreshWorlds() {
  try { const payload = await fetchJson('/worlds'); app.worlds = safeArray(payload.worlds); renderWorlds(); els.worldPicker.disabled = !app.worlds.length; }
  catch (error) { els.worldOptions.innerHTML = `<p class="empty-state">世界尚不可用：${escapeHtml(error.message)}</p>`; els.creationError.textContent = '无法取得世界设定，请确认家中电脑已联网且服务已启动。'; record('worlds-error', error.message); }
}
function renderLibrary() {
  els.gameCount.textContent = app.games.length ? `${app.games.length} 卷` : '';
  if (!app.games.length) { els.libraryList.innerHTML = '<p class="empty-state">你的书库还是空的。第一卷，会从一次选择开始。</p>'; return; }
  els.libraryList.replaceChildren(...app.games.map((game) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'library-card'; button.dataset.gameId = game.id;
    button.innerHTML = `<p>${escapeHtml(game.realm?.name || '未定境界')} · 第 ${Number(game.turnNumber || 0)} 回</p><h3>${escapeHtml(game.title || game.name || '未题书卷')}</h3><p>${escapeHtml(game.name || '无名修士')} · ${escapeHtml(formatDate(game.updatedAt))}</p><footer><span>继续阅读</span><span>→</span></footer>`;
    button.addEventListener('click', () => loadGame(game.id)); return button;
  }));
}
function renderWorlds() {
  if (!app.worlds.length) { els.worldOptions.innerHTML = '<p class="empty-state">当前没有可用世界。</p>'; return; }
  els.worldOptions.replaceChildren(...app.worlds.map((world, index) => {
    const label = document.createElement('label'); label.className = 'world-card';
    label.innerHTML = `<input type="radio" name="world" value="${escapeHtml(world.id)}" ${index === 0 ? 'checked' : ''}/><h3>${escapeHtml(world.title || '未命名世界')}</h3><p>${escapeHtml(world.subtitle || world.description || '世界介绍暂缺。')}</p>`;
    label.querySelector('input').addEventListener('change', () => selectWorld(world.id)); return label;
  }));
  selectWorld(app.worlds[0].id);
}
function selectWorld(worldId) {
  const world = app.worlds.find((item) => item.id === worldId);
  const powers = safeArray(world?.powers);
  els.powerPicker.disabled = !powers.length;
  if (!powers.length) { els.powerOptions.innerHTML = '<p class="empty-state">此世界尚未提供可选天赋。</p>'; validateCreation(); return; }
  els.powerOptions.replaceChildren(...powers.map((power, index) => {
    const label = document.createElement('label'); label.className = 'power-card';
    label.innerHTML = `<input type="radio" name="power" value="${escapeHtml(power.id)}" ${index === 0 ? 'checked' : ''}/><h3>${escapeHtml(power.name || '未命名天赋')}</h3><p>${escapeHtml(power.description || '限制尚未说明。')}</p>`;
    label.querySelector('input').addEventListener('change', validateCreation); return label;
  }));
  validateCreation();
}
function validateCreation() {
  const name = els.heroName.value.trim(); const ready = name.length >= 2 && name.length <= 24 && Boolean($('input[name="world"]:checked')) && Boolean($('input[name="power"]:checked')) && els.adult.checked;
  els.create.disabled = !ready;
  els.heroName.setAttribute('aria-invalid', String(Boolean(name) && (name.length < 2 || name.length > 24)));
}
function stateCardHtml(state = {}) {
  const realm = state.realm || {}; const inventory = safeArray(state.inventory); const relationships = safeArray(state.relationships); const facts = safeArray(state.facts); const progress = Number(realm.progress);
  const meter = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const itemList = inventory.length ? `<ul>${inventory.slice(0, 6).map((item) => `<li>${escapeHtml(item?.name || '未命名物品')}${item?.qty ? ` ×${escapeHtml(item.qty)}` : ''}</li>`).join('')}</ul>` : '<p>尚无重要物品</p>';
  const npcList = relationships.length ? `<ul>${relationships.slice(0, 6).map((npc) => `<li>${escapeHtml(npc?.name || '未命名人物')}${npc?.role ? ` · ${escapeHtml(npc.role)}` : ''}${npc?.attitude ? `（${escapeHtml(npc.attitude)}）` : ''}</li>`).join('')}</ul>` : '<p>尚无人际记录</p>';
  return `<section class="status-card"><h3>当前境界</h3><h2>${escapeHtml(realm.name || '境界未明')}</h2><p>${realm.rank !== undefined ? `位阶 ${escapeHtml(realm.rank)}` : '位阶未记录'}</p><div class="realm-meter" aria-label="境界进度 ${meter}%"><i style="width:${meter}%"></i></div><p>${Number.isFinite(progress) ? `${meter}%` : '进度未记录'}</p></section><section class="status-card power-status"><h3>我的天赋</h3><h2>${escapeHtml(state.power?.name || "未记录")}</h2><p>${escapeHtml(state.power?.description || "")}</p></section><section class="status-card"><h3>所在之地</h3><p>${escapeHtml(state.location || '位置未记录')}</p></section><section class="status-card"><h3>钱财</h3><p>${state.coins === undefined || state.coins === null ? '未记录' : `${escapeHtml(state.coins)} 枚`}</p></section><section class="status-card"><h3>当前目标</h3><p>${escapeHtml(state.goal || '尚未立下目标')}</p></section><section class="status-card"><h3>重要物品</h3>${itemList}</section><section class="status-card"><h3>重要人物</h3>${npcList}</section>${facts.length ? `<section class="status-card"><h3>已知事实</h3><ul>${facts.slice(-4).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul></section>` : ''}`;
}
function renderStatus() { const markup = stateCardHtml(app.game?.state || {}); els.statusRail.innerHTML = markup; els.statusDrawer.innerHTML = `<button class="back-link close-drawer" type="button">← 收起</button>${markup}`; els.statusDrawer.querySelector('.close-drawer').addEventListener('click', closeDrawer); }
function renderNarrative() {
  const turns = safeArray(app.game?.turns); const blocks = turns.map((turn) => `<section class="turn-block"><p class="turn-meta">第 ${escapeHtml(turn.index || '?')} 回 · ${escapeHtml(formatDate(turn.createdAt))}</p>${turnText(turn).split(/\n{2,}/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`).join('');
  const provisional = app.pendingAction ? `<section class="turn-block provisional" id="provisional-turn"><span class="provisional-label">正在生成 · 尚未写入正史</span><p>${escapeHtml(app.pendingAction.text || '等待叙事首字出现……')}</p></section>` : '';
  els.narrative.innerHTML = blocks || '<p class="awaiting">此书卷尚未开始。第一段真实叙事会在你行动后出现。</p>';
  els.narrative.insertAdjacentHTML('beforeend', provisional);
  const pending = $('#provisional-turn'); if (pending) pending.scrollIntoView({ block:'nearest' });
}
function renderActions() {
  const choices = safeArray(app.turn?.choices); const disabled = Boolean(app.stream);
  els.turnCounter.textContent = app.game?.state?.turnNumber !== undefined ? `第 ${app.game.state.turnNumber} 回` : '';
  els.suggestions.replaceChildren(...choices.slice(0, 3).map((choice, index) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'suggestion'; button.disabled = disabled; button.innerHTML = `<b>选择 ${index + 1}</b>${escapeHtml(choice?.label || '未命名行动')}`; button.addEventListener('click', () => submitAction(choice?.label || '')); return button; }));
  if (!choices.length && !app.stream) els.suggestions.innerHTML = '<p class="empty-state">本回合尚未给出建议；你仍可写下自己的行动。</p>';
  els.customAction.disabled = disabled; els.submitAction.disabled = disabled; els.retry.disabled = disabled;
}
function stageLabel(name) {
  const labels = {authored_opening_plan:"铺开开局",plan:"整理后续局势",context_assembly:"回忆当前经历",narrative_generation:"续写你的行动",parse_validate:"核对结果",repair:"修复本段结果",persistence:"保存故事"};
  return labels[name] || (name?.startsWith("acp_") ? "连接叙事模型" : name || "请求已发出");
}
function renderGeneration() {
  if (!app.stream || !app.startedAt) { els.generation.hidden = true; clearInterval(app.timer); app.timer = null; return; }
  const elapsed = Date.now() - app.startedAt; els.generation.hidden = false; els.generation.innerHTML = `<span>真实生成中 · <strong>${escapeHtml(stageLabel(app.pendingAction?.stage))}</strong> · ${formatElapsed(elapsed)}</span><button type="button" class="stop-button" id="stop-turn">停止本次生成</button>`;
  $('#stop-turn').addEventListener('click', cancelTurn);
}
function renderObservability() {
  const metrics = app.lastMetrics || app.turn?.metrics || {}; const rows = app.events.map((event) => `<li><strong>${escapeHtml(event.name)}</strong>${escapeHtml(event.details || '—')}<br><small>${escapeHtml(formatDate(event.at))}</small></li>`).join('');
  els.observability.innerHTML = `<button class="back-link close-drawer" type="button">← 关闭</button><h2>运行记录</h2><p>仅记录客户端可见事件与后端返回字段；不含模型私有推理。</p><p>模型：${escapeHtml(app.health?.provider?.model || '服务未报告')}<br>服务：${escapeHtml(app.health?.provider?.name || '未连接')}</p>${Object.keys(metrics).length ? `<p>本回合指标：${escapeHtml(JSON.stringify({ totalMs:metrics.totalElapsedMs, firstTextMs:metrics.firstReaderVisibleMs, repairs:metrics.repairAttempts, stages:metrics.stages?.map(({name,elapsedMs,status})=>({name,elapsedMs,status})), provider:metrics.provider ? Object.fromEntries(Object.entries(metrics.provider).map(([role,value])=>[role,{model:value.model,reasoning:value.reasoningEffort,sessionId:value.sessionId,runId:value.runId}])) : null }))}</p>` : ''}<ul class="observability-list">${rows || '<li>尚无记录</li>'}</ul>`;
  els.observability.querySelector('.close-drawer').addEventListener('click', closeDrawer);
}
function openDrawer(which) { app.activeDrawer = which; const panel = which === 'status' ? els.statusDrawer : els.observability; panel.classList.add('open'); panel.setAttribute('aria-hidden','false'); els.drawerScrim.hidden = false; (which === 'status' ? els.openStatus : els.openObservability).setAttribute('aria-expanded','true'); panel.focus(); }
function closeDrawer() { if (!app.activeDrawer) return; const panel = app.activeDrawer === 'status' ? els.statusDrawer : els.observability; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); els.drawerScrim.hidden = true; (app.activeDrawer === 'status' ? els.openStatus : els.openObservability).setAttribute('aria-expanded','false'); app.activeDrawer = null; }
function applyGame(game) { app.game = game; app.turn = safeArray(game?.turns).at(-1) || null; els.storyTitle.textContent = game?.title || `${game?.name || '无名修士'}的书卷`; els.storyLocation.textContent = game?.state?.location || '未入尘世'; renderStatus(); renderNarrative(); renderActions(); renderObservability(); saveSession(); }
async function loadGame(id) { try { const payload = await fetchJson(`/games/${encodeURIComponent(id)}`); applyGame(payload.game); showScreen('story'); record('game-loaded', id); } catch (error) { toast(`无法打开书卷：${error.message}`); record('game-load-error', error.message); } }
async function createGame(event) {
  event.preventDefault(); els.creationError.textContent = ''; validateCreation(); if (els.create.disabled) { els.creationError.textContent = '请完成名字、世界、天赋与成年确认。'; return; }
  const body = { name: els.heroName.value.trim(), worldId: $('input[name="world"]:checked')?.value, powerId: $('input[name="power"]:checked')?.value };
  els.create.disabled = true; els.create.textContent = '正在立卷……';
  try { const payload = await fetchJson('/games', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) }); applyGame(payload.game); showScreen('story'); record('game-created', payload.game?.id || 'id missing'); await submitAction('开始我的故事'); }
  catch (error) { els.creationError.textContent = error.message; record('game-create-error', error.message); }
  finally { els.create.textContent = '踏入此世 →'; validateCreation(); }
}
function updateProvisional(text) { if (!app.pendingAction) return; app.pendingAction.text = `${app.pendingAction.text || ''}${text}`; const node = $('#provisional-turn p'); if (node) node.textContent = app.pendingAction.text || '等待叙事首字出现……'; }
function handleSseEvent(name, data) {
  if (name === 'stage') { app.pendingAction.stage = data?.name || '处理中'; record(`stage:${app.pendingAction.stage}`, data?.status || ''); renderGeneration(); return; }
  if (name === 'text') { const delta = data?.delta || ''; if (delta) { if (!app.pendingAction.firstVisibleAt) { app.pendingAction.firstVisibleAt = Date.now(); record('first-visible-narrative', `${app.pendingAction.firstVisibleAt - app.startedAt}ms`); } updateProvisional(delta); } return; }
  if (name === 'complete') { record('complete', `${Date.now() - app.startedAt}ms`); app.turn = data?.turn || null; app.game = data?.game || app.game; app.lastMetrics = data?.metrics || app.turn?.metrics || null; if (app.turn) app.turn.metrics = app.lastMetrics || app.turn.metrics; app.pendingAction = null; app.stream = null; app.startedAt = null; saveSession(); applyGame(app.game); renderGeneration(); renderActions(); refreshLibrary(); toast('本回合已写入正史。'); return; }
  if (name === 'error') { failTurn(data?.message || '叙事服务返回错误。', data); }
}
async function consumeSse(response) {
  checkLogin(response, 'text/event-stream');
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || `行动请求失败（${response.status}）`); }
  if (!response.body) throw new Error('浏览器未提供可读取的流。');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let eventName = 'message'; let dataLines = [];
  const dispatch = () => { if (!dataLines.length) return; const text = dataLines.join('\n'); let data = {}; try { data = JSON.parse(text); } catch { data = { message:text }; } handleSseEvent(eventName, data); eventName = 'message'; dataLines = []; };
  while (true) { const { done, value } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream:true }); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || ''; for (const line of lines) { if (!line) { dispatch(); } else if (line.startsWith('event:')) { eventName = line.slice(6).trim(); } else if (line.startsWith('data:')) { dataLines.push(line.slice(5).trimStart()); } } }
  dispatch(); if (app.stream) throw new Error('叙事流意外结束，未收到完成事件。');
}
async function submitAction(action) {
  const text = String(action || els.customAction.value || '').trim(); if (!text || !app.game?.id || app.stream) return;
  els.turnError.textContent = ''; els.retryRow.hidden = true; els.customAction.value = ''; app.pendingAction = { text:'', action:text, stage:'准备请求', requestId:requestId() }; app.startedAt = Date.now(); app.stream = new AbortController(); saveSession(); record('action-click', text.slice(0, 80)); renderNarrative(); renderActions(); renderGeneration(); app.timer = setInterval(renderGeneration, 1000);
  try {
    const response = await fetch(`${API}/games/${encodeURIComponent(app.game.id)}/turns`, { method:'POST', headers:{Accept:'text/event-stream','Content-Type':'application/json'}, body:JSON.stringify({ action:text, expectedVersion:app.game.version, requestId:app.pendingAction.requestId }), signal:app.stream.signal });
    await consumeSse(response);
  } catch (error) { if (error.name === 'AbortError') return; failTurn(error.message, { code:'network', retryable:true }); }
}
function failTurn(message, details = {}) { record('turn-error', `${details.code || 'unknown'} · ${message}`); app.stream = null; app.startedAt = null; if (app.pendingAction) app.pendingAction.stage = '未写入正史'; els.turnError.textContent = message; els.retryRow.hidden = !app.pendingAction?.action; renderGeneration(); renderNarrative(); renderActions(); saveSession(); }
async function cancelTurn() {
  const gameId=app.game?.id; if(!gameId||!app.stream)return;
  const previousVersion=app.game.version; const controller=app.stream; const pending=app.pendingAction;
  app.stream=null; controller.abort(); app.startedAt=null; record('cancel-click',gameId);
  let cancelConfirmed=false;
  try {
    const payload=await fetchJson(`/games/${encodeURIComponent(gameId)}/cancel`,{method:'POST'});
    cancelConfirmed=Boolean(payload.cancelled);
    const current=await fetchJson(`/games/${encodeURIComponent(gameId)}`);
    if(current.game.version>previousVersion){
      app.pendingAction=null; applyGame(current.game); els.turnError.textContent='停止请求到达前，本回合已完成并保存。'; els.retryRow.hidden=true;
    } else {
      app.pendingAction=pending ? {...pending,text:'',stage:cancelConfirmed?'已停止':'停止状态待确认'}:null;
      applyGame(current.game); els.turnError.textContent=cancelConfirmed?'已确认停止，本次没有写入新回合。':'当前还没有新回合；稍后重试前会重新核对存档。'; els.retryRow.hidden=!pending?.action;
    }
  }catch(error){els.turnError.textContent=`停止状态暂未确认：${error.message}。请刷新检查存档，勿将预览当作已保存。`;els.retryRow.hidden=!pending?.action;}
  finally{renderGeneration();renderNarrative();renderActions();saveSession();}
}
async function retryTurn() {
  const action=app.pendingAction?.action;if(!action||!app.game?.id||app.stream)return;
  try {
    const previousVersion=app.game.version;
    const result=await fetchJson(`/games/${encodeURIComponent(app.game.id)}`);
    if(result.game.version>previousVersion){app.pendingAction=null;applyGame(result.game);els.turnError.textContent='已恢复上次完成的回合，没有重复执行行动。';els.retryRow.hidden=true;return;}
    applyGame(result.game);await submitAction(action);
  }catch(error){els.turnError.textContent=`暂时无法核对存档：${error.message}`;}
}
function download(format) { if (!app.game?.id) return; const link = document.createElement('a'); link.href = `${API}/games/${encodeURIComponent(app.game.id)}/export?format=${format}`; link.download = ''; document.body.append(link); link.click(); link.remove(); record('download', format); }
function bindEvents() {
  $('#new-game-button').addEventListener('click', async () => { showScreen('onboarding'); await refreshWorlds(); els.heroName.focus(); });
  $('#back-to-library').addEventListener('click', () => showScreen('library')); els.creationForm.addEventListener('submit', createGame); els.heroName.addEventListener('input', validateCreation); els.adult.addEventListener('change', validateCreation);
  els.libraryList.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.dataset.gameId) loadGame(event.target.dataset.gameId); });
  els.actionForm.addEventListener('submit', (event) => { event.preventDefault(); submitAction(); });
  els.customAction.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); submitAction(); } });
  els.customAction.addEventListener('input', () => { els.customAction.style.height = 'auto'; els.customAction.style.height = `${Math.min(112, els.customAction.scrollHeight)}px`; });
  els.retry.addEventListener('click', retryTurn); els.openStatus.addEventListener('click', () => openDrawer('status')); els.openObservability.addEventListener('click', () => openDrawer('observability')); els.drawerScrim.addEventListener('click', closeDrawer);
  els.exportMenu.addEventListener('click', () => { const open = els.exportOptions.hidden; els.exportOptions.hidden = !open; els.exportMenu.setAttribute('aria-expanded', String(open)); });
  els.exportOptions.addEventListener('click', (event) => { const format = event.target.dataset.export; if (format) download(format); });
  els.reader.addEventListener('click', () => { const enabled = document.body.classList.toggle('reader-mode'); els.reader.setAttribute('aria-pressed', String(enabled)); els.reader.textContent = enabled ? '退出阅读' : '阅读模式'; });
  $('#theme-toggle').addEventListener('click', () => { document.body.classList.toggle('light'); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDrawer(); });
  window.visualViewport?.addEventListener('resize', () => document.documentElement.style.setProperty('--vvh', `${window.visualViewport.height}px`));
  window.addEventListener('beforeunload', () => { if (app.stream && app.game?.id) navigator.sendBeacon?.(`${API}/games/${encodeURIComponent(app.game.id)}/cancel`); });
}
async function initialize() {
  window.addEventListener('offline', () => { document.querySelector('#connection-notice').hidden = false; setProvider(null); });
  window.addEventListener('online', refreshHealth);
  bindEvents(); renderObservability(); await refreshHealth(); await refreshLibrary(); const session = readSession(); if (session.gameId) { app.pendingAction = session.pendingAction ? { ...session.pendingAction, stage:'页面刷新前的生成未确认' } : null; await loadGame(session.gameId); if (app.pendingAction) { els.turnError.textContent = '页面刷新前的生成状态未知；请确认书卷后重试，未确认文本不会视为正史。'; els.retryRow.hidden = false; renderNarrative(); } }
  if (location.hash === '#new') $('#new-game-button').click();
}
initialize();
window.tgnLive = { download, refreshHealth, refreshLibrary };
