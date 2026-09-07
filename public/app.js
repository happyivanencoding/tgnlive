const API = '/api';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const safeArray = (value) => Array.isArray(value) ? value : [];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[char]);
const requestId = () => crypto.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const formatDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value)) : '时间未记录';
const formatElapsed = (milliseconds) => milliseconds < 1000 ? `${Math.max(0, Math.round(milliseconds))} 毫秒` : `${(milliseconds / 1000).toFixed(milliseconds < 10000 ? 1 : 0)} 秒`;
const turnText = (turn) => String(turn?.narrative || turn?.text || '');

const els = {
  siteHeader: $('#site-header'), provider: $('#provider-chip'), connection: $('#connection-notice'),
  libraryScreen: $('#library-screen'), onboardingScreen: $('#onboarding-screen'), storyScreen: $('#story-screen'),
  hubViews: $$('.hub-view'), hubTabs: $$('.hub-tab'), continueCard: $('#continue-card'),
  libraryList: $('#library-list'), gameCount: $('#game-count'), worldGrid: $('#world-grid'), worldFilters: $('#world-filters'), worldError: $('#world-error'),
  worldForm: $('#world-form'), worldPrompt: $('#world-prompt'), promptCount: $('#prompt-count'), generateWorld: $('#generate-world'), worldGeneration: $('#world-generation'), worldStage: $('#world-stage'), worldElapsed: $('#world-elapsed'), cancelWorld: $('#cancel-world'), worldRecovery: $('#world-recovery'), worldErrorMessage: $('#world-error-message'),
  worldPreview: $('#world-preview'), creationForm: $('#creation-form'), heroName: $('#hero-name'), adult: $('#adult-confirmation'), worldPicker: $('#world-picker'), worldOptions: $('#world-options'), powerPicker: $('#power-picker'), powerOptions: $('#power-options'), creationError: $('#creation-error'), createGame: $('#create-game-button'),
  storyTitle: $('#story-title'), storyLocation: $('#story-location'), statusRail: $('#status-rail'), narrative: $('#narrative'), storyEnd: $('#story-end'),
  actionArea: $('#action-area'), suggestions: $('#suggested-actions'), actionForm: $('#action-form'), customAction: $('#custom-action'), submitAction: $('#submit-action'), turnCounter: $('#turn-counter'), draftStatus: $('#draft-status'), turnError: $('#turn-error'), retry: $('#retry-turn'), retryRow: $('#retry-row'), generation: $('#generation-status'), latest: $('#back-to-latest'), growth: $('#growth-feedback'),
  storyMenu: $('#story-menu'), storyMenuPopover: $('#story-menu-popover'), exportMenu: $('#export-menu'), exportOptions: $('#export-options'), reader: $('#reader-toggle'),
  openStatus: $('#open-status'), statusDrawer: $('#status-drawer'), readingSettings: $('#reading-settings'), observability: $('#observability-panel'), openObservability: $('#open-observability'), scrim: $('#drawer-scrim'), toastRegion: $('#toast-region'),
};

const app = {
  health: null, worlds: [], games: [], worldFilter: '全部', selectedWorld: null, game: null, turn: null,
  stream: null, worldStream: null, pendingAction: null, pendingWorld: null, startedAt: null, timer: null,
  worldStartedAt: null, worldTimer: null, lastMetrics: null, events: [], activeSheet: null, sheetTrigger: null,
  followLatest: true, composing: false, currentScreen: 'library', previousHub: 'discover',
};

function record(name, details = '') {
  app.events.unshift({ name, details, at: new Date().toISOString() });
  app.events = app.events.slice(0, 35);
  renderObservability();
}

function toast(message) {
  const node = document.createElement('div');
  node.className = 'toast'; node.textContent = message; els.toastRegion.replaceChildren(node);
  setTimeout(() => node.remove(), 3600);
}

function checkLogin(response, expectedType = 'application/json') {
  const type = response.headers.get('content-type') || '';
  if (response.redirected || (response.ok && !type.includes(expectedType))) {
    els.connection.hidden = false;
    throw new Error('登录可能已过期，请重新连接。');
  }
}

async function fetchJson(path, options) {
  const response = await fetch(`${API}${path}`, options);
  checkLogin(response);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `请求失败（${response.status}）`);
  return payload;
}

function showScreen(name) {
  app.currentScreen = name;
  const map = { library:els.libraryScreen, onboarding:els.onboardingScreen, story:els.storyScreen };
  Object.entries(map).forEach(([key, node]) => { node.hidden = key !== name; node.classList.toggle('active', key === name); });
  els.siteHeader.hidden = name === 'story';
  document.body.classList.toggle('in-story', name === 'story');
  closeStoryMenu();
  if (name !== 'story') document.body.classList.remove('reader-mode', 'keyboard-open');
  window.scrollTo({ top:0, behavior:'instant' });
}

function showHub(view) {
  app.previousHub = view;
  history.replaceState(null, '', location.pathname);
  showScreen('library');
  els.hubViews.forEach((node) => { const active = node.dataset.view === view; node.hidden = !active; node.classList.toggle('active', active); });
  els.hubTabs.forEach((tab) => { const active = tab.dataset.hubView === view; tab.classList.toggle('active', active); active ? tab.setAttribute('aria-current','page') : tab.removeAttribute('aria-current'); });
  if (view === 'create') setTimeout(() => els.worldPrompt.focus(), 0);
}

function setProvider(health) {
  app.health = health;
  const provider = health?.provider;
  const available = health?.ok && ['ready', 'configured'].includes(provider?.status);
  els.provider.textContent = provider?.status === 'ready' ? '叙事服务就绪' : available ? '可开始故事' : provider?.warning || '暂时无法连接';
  els.provider.className = `provider-dot ${available ? 'ok' : 'error'}`;
}

async function refreshHealth() {
  try { setProvider(await fetchJson('/health')); els.connection.hidden = true; }
  catch (error) { setProvider(null); record('health-error', error.message); }
}

function worldSource(world) {
  return world?.sourceLabel || (world?.createdAt ? '你的原创世界' : '原创世界');
}

function worldTags(world) {
  return [...new Set([world?.genre, ...safeArray(world?.tags)].filter(Boolean))].slice(0, 4);
}

function worldGlyph(world, index = 0) {
  const title = String(world?.title || '界');
  return title.replace(/[\s·：:]/g, '').slice(0, 1) || ['山','海','城'][index % 3];
}

function renderWorldFilters() {
  const filters = ['全部', ...new Set(app.worlds.flatMap((world) => [world.genre, ...safeArray(world.tags)]).filter(Boolean))].slice(0, 8);
  els.worldFilters.replaceChildren(...filters.map((filter) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `filter-chip${filter === app.worldFilter ? ' active' : ''}`; button.textContent = filter;
    button.addEventListener('click', () => { app.worldFilter = filter; renderWorldFilters(); renderWorlds(); }); return button;
  }));
}

function renderWorlds() {
  const filtered = app.worldFilter === '全部' ? app.worlds : app.worlds.filter((world) => worldTags(world).includes(app.worldFilter));
  if (!filtered.length) { els.worldGrid.innerHTML = '<p class="empty-state">这个分类暂时没有世界。</p>'; return; }
  els.worldGrid.replaceChildren(...filtered.map((world, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'world-card'; button.dataset.worldId = world.id;
    button.setAttribute('aria-label', `查看世界：${world.title || '未命名世界'}`);
    button.innerHTML = `<span class="world-art" data-glyph="${escapeHtml(worldGlyph(world,index))}"><span class="world-label">${escapeHtml(worldSource(world))}</span></span><span class="world-body"><span class="world-subtitle">${escapeHtml(world.subtitle || world.genre || '成长世界')}</span><h3>${escapeHtml(world.title || '未命名世界')}</h3><span class="world-description">${escapeHtml(world.description || '进入后，你的每一次选择都会成为这个世界的事实。')}</span><span class="tag-row">${worldTags(world).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</span></span>`;
    button.addEventListener('click', () => openWorld(world)); return button;
  }));
}

async function refreshWorlds() {
  els.worldError.hidden = true;
  try {
    const payload = await fetchJson('/worlds'); app.worlds = safeArray(payload.worlds); app.worldFilter = '全部';
    renderWorldFilters(); renderWorlds();
    if (!app.worlds.length) els.worldGrid.innerHTML = '<p class="empty-state">暂时没有可进入的世界。</p>';
  } catch (error) {
    els.worldGrid.innerHTML = '';
    els.worldError.hidden = false;
    els.worldError.innerHTML = `诸界暂时没有回应：${escapeHtml(error.message)} <button type="button">重新载入</button>`;
    els.worldError.querySelector('button').addEventListener('click', refreshWorlds);
    record('worlds-load-error', error.message);
  }
}

function renderLibrary() {
  els.gameCount.textContent = app.games.length ? String(app.games.length) : '';
  if (!app.games.length) {
    els.libraryList.innerHTML = '<p class="empty-state">书架还是空的。去发现一个世界，写下你的第一回。</p>';
    els.continueCard.hidden = true; return;
  }
  const latest = app.games[0];
  els.continueCard.hidden = false;
  els.continueCard.innerHTML = `<span class="continue-seal" aria-hidden="true">续</span><div><h2>${escapeHtml(latest.title || `${latest.name || '无名者'}的书卷`)}</h2><p>${escapeHtml(latest.name || '无名者')} · ${escapeHtml(latest.realm?.name || '凡身')} · 第 ${escapeHtml(latest.turnNumber ?? 0)} 回</p></div><button type="button">继续阅读</button>`;
  els.continueCard.querySelector('button').addEventListener('click', () => loadGame(latest.id));
  els.libraryList.replaceChildren(...app.games.map((game) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'library-card'; button.dataset.gameId = game.id;
    button.innerHTML = `<span class="book-kicker">${escapeHtml(game.realm?.name || '凡身')} · 第 ${escapeHtml(game.turnNumber ?? 0)} 回</span><h3>${escapeHtml(game.title || `${game.name || '无名者'}的书卷`)}</h3><p>${escapeHtml(game.name || '无名者')} · ${escapeHtml(formatDate(game.updatedAt))}</p><footer><span>继续阅读</span><span>→</span></footer>`;
    button.addEventListener('click', () => loadGame(game.id)); return button;
  }));
}

async function refreshLibrary() {
  try { const payload = await fetchJson('/games'); app.games = safeArray(payload.games).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)); renderLibrary(); }
  catch (error) { els.libraryList.innerHTML = `<p class="empty-state">书架读取失败：${escapeHtml(error.message)}</p>`; els.continueCard.hidden = true; record('library-error', error.message); }
}

function normalizedPowerSystem(world) {
  const system = world?.powerSystem || {};
  return { summary:system.summary || '力量来自选择、代价与积累，不会无故降临。', growth:system.growth || '从凡身起步，在故事中取得真实成长。', realms:safeArray(system.realms) };
}

function renderWorldPreview(world) {
  const system = normalizedPowerSystem(world); const tags = worldTags(world);
  els.worldPreview.innerHTML = `<div><p class="eyebrow">${escapeHtml(worldSource(world))}</p><h1>${escapeHtml(world.title || '未命名世界')}</h1><p class="preview-subtitle">${escapeHtml(world.subtitle || tags.join(' · ') || '一段等待你进入的命途')}</p><p class="preview-description">${escapeHtml(world.description || '世界会在你的行动中展开，并记住已经发生的一切。')}</p><div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div><section class="power-system"><p class="eyebrow">POWER SYSTEM</p><h2>${escapeHtml(system.summary)}</h2>${system.realms.length ? `<div class="realm-path">${system.realms.slice(0,7).map((realm) => `<span>${escapeHtml(realm.name || realm)}</span>`).join('')}</div>` : ''}<p>${escapeHtml(system.growth)}</p></section>`;
}

function openWorld(world) {
  if (!world) return;
  app.selectedWorld = world; renderWorldPreview(world);
  els.worldOptions.innerHTML = `<label><input type="radio" name="world" value="${escapeHtml(world.id)}" checked />${escapeHtml(world.title || '当前世界')}</label>`;
  renderPowers(world); validateCreation(); showScreen('onboarding'); setTimeout(() => els.heroName.focus(), 0);
}

function renderPowers(world) {
  const powers = safeArray(world?.powers); els.powerPicker.disabled = !powers.length;
  if (!powers.length) { els.powerOptions.innerHTML = '<p class="empty-state">此世界暂时没有可选天赋。</p>'; validateCreation(); return; }
  els.powerOptions.replaceChildren(...powers.map((power, index) => {
    const label = document.createElement('label'); label.className = 'power-card';
    label.innerHTML = `<input type="radio" name="power" value="${escapeHtml(power.id)}" ${index === 0 ? 'checked' : ''}/><h3>${escapeHtml(power.name || '未命名天赋')}</h3><p>${escapeHtml(power.description || '它的边界与代价会在世界中显现。')}</p>`;
    label.querySelector('input').addEventListener('change', validateCreation); return label;
  }));
  validateCreation();
}

function validateCreation() {
  const name = els.heroName.value.trim();
  const ready = name.length >= 2 && name.length <= 24 && Boolean($('input[name="world"]:checked')) && Boolean($('input[name="power"]:checked')) && els.adult.checked;
  els.createGame.disabled = !ready;
  els.heroName.setAttribute('aria-invalid', String(Boolean(name) && (name.length < 2 || name.length > 24)));
}

function stageLabel(name) {
  const labels = { queued:'等待空闲叙事席位', validating:'核对你的描述', context_assembly:'整理世界规则', world_generation:'构筑世界与力量体系', world_validation:'核对世界规则', world_persistence:'保存新世界', authored_opening_plan:'铺开开局', plan:'整理后续局势', narrative_generation:'续写你的行动', parse_validate:'核对结果', repair:'修复本段结果', persistence:'写入正史' };
  return labels[name] || (String(name || '').startsWith('acp_') ? '连接叙事模型' : name || '请求已发出');
}

async function consumeSse(response, onEvent, isActive) {
  checkLogin(response, 'text/event-stream');
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(payload.message || `请求失败（${response.status}）`); }
  if (!response.body) throw new Error('浏览器未提供可读取的事件流。');
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let eventName = 'message'; let dataLines = [];
  const dispatch = () => { if (!dataLines.length) return; const raw = dataLines.join('\n'); let data; try { data = JSON.parse(raw); } catch { data = { message:raw }; } onEvent(eventName, data); eventName = 'message'; dataLines = []; };
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream:true }); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
    for (const line of lines) { if (!line) dispatch(); else if (line.startsWith('event:')) eventName = line.slice(6).trim(); else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart()); }
  }
  dispatch(); if (isActive()) throw new Error('事件流意外结束，未收到完成事件。');
}

function renderWorldGeneration() {
  if (!app.worldStream || !app.worldStartedAt) { els.worldGeneration.hidden = true; clearInterval(app.worldTimer); app.worldTimer = null; return; }
  const elapsed = Math.max(Date.now() - app.worldStartedAt, app.pendingWorld?.reportedElapsed || 0);
  els.worldGeneration.hidden = false; els.worldStage.textContent = stageLabel(app.pendingWorld?.stage); els.worldElapsed.textContent = `已用时 ${formatElapsed(elapsed)} · 只显示真实阶段，不估算百分比`;
}

function failWorld(message, details = {}) {
  app.worldStream = null; app.worldStartedAt = null; renderWorldGeneration();
  els.worldRecovery.hidden = false; els.worldErrorMessage.textContent = details.code === 'cancelled' ? '已停止。本次结果没有保存，你可以修改描述或重试。' : message;
  els.worldForm.hidden = false; els.generateWorld.disabled = false;
  record('world-error', `${details.code || 'unknown'} · ${message}`);
}

async function generateWorld(event) {
  event?.preventDefault(); const prompt = els.worldPrompt.value.trim(); if (!prompt || app.worldStream) return;
  els.worldRecovery.hidden = true; els.worldForm.hidden = true; els.generateWorld.disabled = true;
  app.pendingWorld = { prompt, requestId:app.pendingWorld?.prompt === prompt ? app.pendingWorld.requestId : requestId(), stage:'validating', reportedElapsed:0 };
  app.worldStartedAt = Date.now(); app.worldStream = new AbortController(); renderWorldGeneration(); app.worldTimer = setInterval(renderWorldGeneration, 250);
  record('world-request', prompt.slice(0,80));
  try {
    const response = await fetch(`${API}/worlds/custom`, { method:'POST', headers:{Accept:'text/event-stream','Content-Type':'application/json'}, body:JSON.stringify({ prompt, requestId:app.pendingWorld.requestId }), signal:app.worldStream.signal });
    await consumeSse(response, (name, data) => {
      if (name === 'stage') { app.pendingWorld.stage = data?.name || 'world_generation'; app.pendingWorld.reportedElapsed = Number(data?.elapsedMs) || 0; renderWorldGeneration(); record(`world-stage:${app.pendingWorld.stage}`, data?.status || ''); }
      if (name === 'complete') {
        const world = data?.world; if (!world?.id) return failWorld('世界生成结果不完整。', { code:'invalid_result' });
        app.worldStream = null; app.worldStartedAt = null; renderWorldGeneration(); app.pendingWorld = null;
        app.worlds = [world, ...app.worlds.filter((item) => item.id !== world.id)]; renderWorldFilters(); renderWorlds(); record('world-complete', world.id); openWorld(world);
      }
      if (name === 'error') failWorld(data?.message || '世界生成失败。', data || {});
    }, () => Boolean(app.worldStream));
  } catch (error) {
    if (error.name === 'AbortError') return;
    failWorld(error.message, { code:'network', retryable:true });
  }
}

function cancelWorld() {
  if (!app.worldStream) return;
  const controller = app.worldStream; app.worldStream = null; controller.abort(); app.worldStartedAt = null; renderWorldGeneration();
  failWorld('已停止生成。', { code:'cancelled', retryable:true });
}

async function createGame(event) {
  event.preventDefault(); els.creationError.textContent = ''; validateCreation();
  if (els.createGame.disabled) { els.creationError.textContent = '请完成主角名、天赋与成年确认。'; return; }
  const body = { name:els.heroName.value.trim(), worldId:$('input[name="world"]:checked')?.value, powerId:$('input[name="power"]:checked')?.value };
  els.createGame.disabled = true; els.createGame.textContent = '正在立卷……';
  try {
    const payload = await fetchJson('/games', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    applyGame(payload.game, { initial:true }); showScreen('story'); record('game-created', payload.game?.id || 'id missing'); await submitTurn('开始我的故事');
  } catch (error) { els.creationError.textContent = error.message; record('game-create-error', error.message); }
  finally { els.createGame.innerHTML = '以此身入世 <span>→</span>'; validateCreation(); }
}

function stateCardHtml(state = {}) {
  const realm = state.realm || {}; const progress = Number(realm.progress); const meter = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const inventory = safeArray(state.inventory); const relationships = safeArray(state.relationships); const facts = safeArray(state.facts); const currency = state.currencyName || '铜钱';
  const currentPower = safeArray(state.capabilities).find(ability => ability.id === `power-${state.power?.id}`) || state.power;
  const abilities = safeArray(state.capabilities).filter(ability => ability.id !== `power-${state.power?.id}`);
  const powerDetails = `${realm.benchmark ? `<section class="status-summary"><h3>这个境界意味着什么</h3><p>${escapeHtml(realm.benchmark)}</p><p>${escapeHtml(realm.unlock || '')}</p></section>` : ''}${abilities.length ? `<section class="status-summary"><h3>已掌握的能力</h3>${abilities.map(ability => `<h4>${escapeHtml(ability.name)}</h4><p>${escapeHtml(ability.description)}</p>`).join('')}</section>` : ''}`;
  const itemList = inventory.length ? `<ul>${inventory.slice(0,8).map((item) => `<li>${escapeHtml(item?.name || '未命名物品')}${item?.qty ? ` ×${escapeHtml(item.qty)}` : ''}${item?.description ? `<small class="item-description">${escapeHtml(item.description)}</small>` : ''}</li>`).join('')}</ul>` : '<p>尚无重要物品</p>';
  const npcList = relationships.length ? `<ul>${relationships.slice(0,8).map((npc) => `<li>${escapeHtml(npc?.name || '未命名人物')}${npc?.role ? ` · ${escapeHtml(npc.role)}` : ''}${npc?.attitude ? `（${escapeHtml(npc.attitude)}）` : ''}</li>`).join('')}</ul>` : '<p>尚无人际记录</p>';
  return `<section class="status-summary"><h3>当前境界</h3><h2>${escapeHtml(realm.name || '境界未明')}</h2><p>${realm.rank !== undefined ? `位阶 ${escapeHtml(realm.rank)}` : '位阶未记录'} · ${Number.isFinite(progress) ? `${meter}%` : '进度未记录'}</p><div class="realm-meter" aria-label="境界进度 ${meter}%"><i style="width:${meter}%"></i></div></section><section class="status-summary"><h3>本命天赋</h3><h2>${escapeHtml(currentPower?.name || '未记录')}</h2><p>${escapeHtml(currentPower?.description || '')}</p></section>${powerDetails}<section class="status-summary"><h3>所在之地</h3><p>${escapeHtml(state.location || '位置未记录')}</p></section><section class="status-summary"><h3>${escapeHtml(currency)}</h3><p>${state.coins === undefined || state.coins === null ? '未记录' : escapeHtml(state.coins)}</p></section><section class="status-summary"><h3>当前目标</h3><p>${escapeHtml(state.goal || '尚未立下目标')}</p></section><section class="status-summary"><h3>重要物品</h3>${itemList}</section><section class="status-summary"><h3>重要人物</h3>${npcList}</section>${facts.length ? `<section class="status-summary"><h3>已知事实</h3><ul>${facts.slice(-6).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul></section>` : ''}`;
}

function renderStatus() {
  const markup = stateCardHtml(app.game?.state || {}); els.statusRail.innerHTML = markup;
  els.statusDrawer.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>修行状态</h2><button class="sheet-close" type="button" aria-label="关闭状态">×</button></header><div class="sheet-grid">${markup}</div>`;
  els.statusDrawer.querySelector('.sheet-close').addEventListener('click', closeSheet);
}

function nearStoryBottom() {
  return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) < Math.max(260, els.actionArea.offsetHeight + 80);
}

function renderNarrative(options = {}) {
  const shouldFollow = options.forceLatest || app.followLatest || nearStoryBottom(); const turns = safeArray(app.game?.turns);
  els.narrative.innerHTML = turns.map((turn) => `<section class="turn-block"><p class="turn-meta">第 ${escapeHtml(turn.index || '?')} 回 · ${escapeHtml(formatDate(turn.createdAt))}</p>${turnText(turn).split(/\n{2,}/).filter(Boolean).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}${turn.action && turn.index > 1 ? `<span class="turn-action">你选择：${escapeHtml(turn.action)}</span>` : ''}</section>`).join('') || '<p class="awaiting">书卷已立。第一段真实叙事会在开局行动后出现。</p>';
  if (app.pendingAction) els.narrative.insertAdjacentHTML('beforeend', `<section class="turn-block provisional" id="provisional-turn"><span class="provisional-label">正在生成 · 尚未写入正史</span><p>${escapeHtml(app.pendingAction.text || '等待叙事首字出现……')}</p></section>`);
  els.storyEnd.hidden = Boolean(app.pendingAction) || !turns.length;
  if (shouldFollow) requestAnimationFrame(() => scrollToLatest('instant'));
}

function renderActions() {
  const choices = safeArray(app.turn?.choices); const disabled = Boolean(app.stream);
  els.turnCounter.textContent = app.game?.state?.turnNumber !== undefined ? `第 ${app.game.state.turnNumber} 回` : '';
  els.suggestions.replaceChildren(...choices.slice(0,3).map((choice,index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'suggestion'; button.disabled = disabled;
    button.innerHTML = `<b>选择 ${index + 1}</b>${escapeHtml(choice?.label || '未命名行动')}`; button.addEventListener('click', () => submitTurn(choice?.label || '')); return button;
  }));
  if (!choices.length && !app.stream) els.suggestions.innerHTML = '<p class="empty-state">你可以直接写下自己的行动。</p>';
  els.customAction.disabled = disabled; els.submitAction.disabled = disabled; els.retry.disabled = disabled;
}

function renderGeneration() {
  if (!app.stream || !app.startedAt) { els.generation.hidden = true; els.narrative.setAttribute('aria-busy','false'); clearInterval(app.timer); app.timer = null; updateDockHeight(); return; }
  const elapsed = Math.max(Date.now() - app.startedAt, app.pendingAction?.reportedElapsed || 0); els.narrative.setAttribute('aria-busy','true'); els.generation.hidden = false;
  els.generation.innerHTML = `<span><i class="stage-pulse"></i><strong>${escapeHtml(stageLabel(app.pendingAction?.stage))}</strong> · ${escapeHtml(formatElapsed(elapsed))}</span><button type="button" class="stop-button" id="stop-turn">停止</button>`;
  $('#stop-turn').addEventListener('click', cancelTurn); updateDockHeight();
}

function renderObservability() {
  const metrics = app.lastMetrics || app.turn?.metrics || {}; const rows = app.events.map((event) => `<li><strong>${escapeHtml(event.name)}</strong>${escapeHtml(event.details || '—')}<br><small>${escapeHtml(formatDate(event.at))}</small></li>`).join('');
  els.observability.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>生成记录</h2><button class="sheet-close" type="button" aria-label="关闭生成记录">×</button></header><p>仅显示客户端事件和后端返回字段，不包含模型私有推理。</p><p>模型：${escapeHtml(app.health?.provider?.model || '服务未报告')}<br>本回合总耗时：${metrics.totalElapsedMs == null && metrics.totalMs == null ? '未报告' : escapeHtml(formatElapsed(metrics.totalElapsedMs ?? metrics.totalMs))}</p><ul class="observability-list">${rows || '<li>尚无记录</li>'}</ul>`;
  els.observability.querySelector('.sheet-close').addEventListener('click', closeSheet);
}

function renderReadingSettings() {
  const settings = readReadingSettings();
  els.readingSettings.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>阅读设置</h2><button class="sheet-close" type="button" aria-label="关闭阅读设置">×</button></header><div class="setting-row"><label for="font-size-setting"><span>正文字号</span><span id="font-size-value">${settings.fontSize}px</span></label><input id="font-size-setting" type="range" min="16" max="24" step="1" value="${settings.fontSize}" /></div><div class="setting-row"><label for="line-height-setting"><span>行间距</span><span id="line-height-value">${settings.lineHeight.toFixed(2)}</span></label><input id="line-height-setting" type="range" min="1.7" max="2.4" step="0.05" value="${settings.lineHeight}" /></div><div class="setting-row"><span>页面底色</span><div class="setting-buttons"><button type="button" data-reader-theme="dark">墨夜</button><button type="button" data-reader-theme="light">宣纸</button><button type="button" data-reader-theme="system">跟随</button></div></div>`;
  els.readingSettings.querySelector('.sheet-close').addEventListener('click', closeSheet);
  const size = $('#font-size-setting'); const leading = $('#line-height-setting');
  size.addEventListener('input', () => saveReadingSettings({ fontSize:Number(size.value) })); leading.addEventListener('input', () => saveReadingSettings({ lineHeight:Number(leading.value) }));
  $$('[data-reader-theme]').forEach((button) => { button.classList.toggle('active', button.dataset.readerTheme === settings.theme); button.addEventListener('click', () => { saveReadingSettings({ theme:button.dataset.readerTheme }); renderReadingSettings(); }); });
}

function readReadingSettings() {
  try { return { fontSize:18, lineHeight:2.05, theme:'system', ...JSON.parse(localStorage.getItem('tgn-live-reading') || '{}') }; }
  catch { return { fontSize:18, lineHeight:2.05, theme:'system' }; }
}

function saveReadingSettings(patch = {}) {
  const settings = { ...readReadingSettings(), ...patch }; localStorage.setItem('tgn-live-reading', JSON.stringify(settings)); applyReadingSettings(settings);
  if ($('#font-size-value')) $('#font-size-value').textContent = `${settings.fontSize}px`;
  if ($('#line-height-value')) $('#line-height-value').textContent = Number(settings.lineHeight).toFixed(2);
}

function applyReadingSettings(settings = readReadingSettings()) {
  document.documentElement.style.setProperty('--reader-size', `${settings.fontSize}px`); document.documentElement.style.setProperty('--reader-leading', settings.lineHeight);
  const light = settings.theme === 'light' || (settings.theme === 'system' && localStorage.getItem('tgn-live-theme') === 'light'); document.body.classList.toggle('light', light);
}

function focusableIn(node) { return $$Within(node, 'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'); }
function $$Within(node, selector) { return [...node.querySelectorAll(selector)].filter((item) => !item.hidden); }

function openSheet(name, trigger) {
  closeStoryMenu(); closeSheet(false); const panel = name === 'status' ? els.statusDrawer : name === 'reading' ? els.readingSettings : els.observability;
  if (name === 'status') renderStatus(); if (name === 'reading') renderReadingSettings(); if (name === 'observability') renderObservability();
  app.activeSheet = panel; app.sheetTrigger = trigger || document.activeElement; els.scrim.hidden = false; panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
  trigger?.setAttribute('aria-expanded','true'); setTimeout(() => (panel.querySelector('.sheet-close') || panel).focus(), 0);
}

function closeSheet(restore = true) {
  if (!app.activeSheet) return;
  const panel = app.activeSheet; panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); els.scrim.hidden = true;
  [els.openStatus, els.openObservability].forEach((button) => button?.setAttribute('aria-expanded','false'));
  const trigger = app.sheetTrigger; app.activeSheet = null; app.sheetTrigger = null; if (restore) trigger?.focus();
}

function applyGame(game, options = {}) {
  const changedGame = app.game?.id !== game?.id; app.game = game; app.turn = safeArray(game?.turns).at(-1) || null;
  els.storyTitle.textContent = game?.title || `${game?.name || '无名修士'}的书卷`; els.storyLocation.textContent = game?.state?.location || '未入尘世'; renderStatus(); renderNarrative({ forceLatest:options.initial || changedGame }); renderActions(); renderObservability(); restoreDraft(changedGame);
}

async function loadGame(id) {
  try { const payload = await fetchJson(`/games/${encodeURIComponent(id)}`); applyGame(payload.game, { initial:true }); showScreen('story'); history.replaceState(null, '', `${location.pathname}?game=${encodeURIComponent(id)}`); requestAnimationFrame(() => scrollToLatest('instant')); record('game-loaded', id); }
  catch (error) { toast(`无法打开书卷：${error.message}`); record('game-load-error', error.message); }
}

function updateProvisional(text) {
  if (!app.pendingAction) return; app.pendingAction.text = `${app.pendingAction.text || ''}${text}`;
  const node = $('#provisional-turn p'); if (node) node.textContent = app.pendingAction.text || '等待叙事首字出现……';
  if (app.followLatest) requestAnimationFrame(() => scrollToLatest('smooth'));
}

function showGrowth(changes) {
  const items = safeArray(changes).filter(Boolean); if (!items.length) return;
  els.growth.hidden = false; els.growth.innerHTML = `<button type="button" aria-label="关闭成长变化">×</button><h2>此行留下了变化</h2><ul>${items.slice(0,6).map((change) => `<li>${escapeHtml(change)}</li>`).join('')}</ul>`;
  els.growth.querySelector('button').addEventListener('click', () => { els.growth.hidden = true; }); setTimeout(() => { els.growth.hidden = true; }, 7000);
}

function handleTurnEvent(name, data) {
  if (name === 'stage') { app.pendingAction.stage = data?.name || '处理中'; app.pendingAction.reportedElapsed = Number(data?.elapsedMs) || 0; record(`stage:${app.pendingAction.stage}`, data?.status || ''); renderGeneration(); return; }
  if (name === 'text') { const delta = data?.delta || ''; if (delta) { if (!app.pendingAction.firstVisibleAt) { app.pendingAction.firstVisibleAt = Date.now(); record('first-visible-narrative', `${app.pendingAction.firstVisibleAt - app.startedAt}ms`); } updateProvisional(delta); } return; }
  if (name === 'complete') {
    const elapsed = Date.now() - app.startedAt; record('complete', `${elapsed}ms`); app.turn = data?.turn || null; app.game = data?.game || app.game; app.lastMetrics = data?.metrics || app.turn?.metrics || null;
    if (app.turn) app.turn.metrics = app.lastMetrics || app.turn.metrics; const changes = app.turn?.changes; app.pendingAction = null; app.stream = null; app.startedAt = null; clearDraft(); applyGame(app.game); renderGeneration(); renderActions(); refreshLibrary(); showGrowth(changes); toast('本回合已写入正史。'); return;
  }
  if (name === 'error') failTurn(data?.message || '叙事服务返回错误。', data);
}

async function submitTurn(action) {
  const text = String(action || els.customAction.value || '').trim(); if (!text || !app.game?.id || app.stream) return;
  const shouldFollow = app.followLatest || nearStoryBottom();
  els.turnError.textContent = ''; els.retry.hidden = true; clearDraft(); els.customAction.value = ''; resizeComposer(); app.followLatest = shouldFollow;
  app.pendingAction = { text:'', action:text, stage:'validating', requestId:requestId(), reportedElapsed:0 }; app.startedAt = Date.now(); app.stream = new AbortController(); record('action-click', text.slice(0,80)); renderNarrative({ forceLatest:shouldFollow }); renderActions(); renderGeneration(); app.timer = setInterval(renderGeneration, 250);
  try {
    const response = await fetch(`${API}/games/${encodeURIComponent(app.game.id)}/turns`, { method:'POST', headers:{Accept:'text/event-stream','Content-Type':'application/json'}, body:JSON.stringify({ action:text, expectedVersion:app.game.version, requestId:app.pendingAction.requestId }), signal:app.stream.signal });
    await consumeSse(response, handleTurnEvent, () => Boolean(app.stream));
  } catch (error) { if (error.name === 'AbortError') return; failTurn(error.message, { code:'network', retryable:true }); }
}

function failTurn(message, details = {}) {
  record('turn-error', `${details.code || 'unknown'} · ${message}`); app.stream = null; app.startedAt = null;
  if (app.pendingAction) { app.pendingAction.stage = '未写入正史'; saveDraft(app.pendingAction.action); }
  els.turnError.textContent = message; els.retry.hidden = !app.pendingAction?.action; renderGeneration(); renderNarrative(); renderActions();
}

async function cancelTurn() {
  const gameId = app.game?.id; if (!gameId || !app.stream) return;
  const previousVersion = app.game.version; const controller = app.stream; const pending = app.pendingAction; app.stream = null; controller.abort(); app.startedAt = null; record('cancel-click', gameId);
  try {
    const payload = await fetchJson(`/games/${encodeURIComponent(gameId)}/cancel`, { method:'POST' }); const current = await fetchJson(`/games/${encodeURIComponent(gameId)}`);
    if (current.game.version > previousVersion) { app.pendingAction = null; clearDraft(); applyGame(current.game); els.turnError.textContent = '停止到达前，本回合已完成并保存。'; els.retry.hidden = true; }
    else { app.pendingAction = pending ? { ...pending, text:'', stage:payload.cancelled ? '已停止' : '停止状态待确认' } : null; saveDraft(pending?.action || ''); applyGame(current.game); els.turnError.textContent = payload.cancelled ? '已确认停止，本次没有写入新回合。' : '当前还没有新回合；重试前会重新核对存档。'; els.retry.hidden = !pending?.action; }
  } catch (error) { saveDraft(pending?.action || ''); els.turnError.textContent = `停止状态暂未确认：${error.message}。刷新后核对书卷再重试。`; els.retry.hidden = !pending?.action; }
  finally { renderGeneration(); renderNarrative(); renderActions(); }
}

async function retryTurn() {
  const action = app.pendingAction?.action || els.customAction.value.trim(); if (!action || !app.game?.id || app.stream) return;
  try {
    const previousVersion = app.game.version; const result = await fetchJson(`/games/${encodeURIComponent(app.game.id)}`);
    if (result.game.version > previousVersion) { app.pendingAction = null; clearDraft(); applyGame(result.game); els.turnError.textContent = '已恢复上次完成的回合，没有重复执行行动。'; els.retry.hidden = true; return; }
    app.pendingAction = null; applyGame(result.game); await submitTurn(action);
  } catch (error) { els.turnError.textContent = `暂时无法核对存档：${error.message}`; }
}

function draftKey() { return app.game?.id ? `tgn-live-draft:${app.game.id}` : null; }
function saveDraft(value = els.customAction.value) { const key = draftKey(); if (!key) return; const text = String(value || ''); text ? localStorage.setItem(key, text) : localStorage.removeItem(key); els.draftStatus.textContent = text ? '草稿已保存在这本书中' : '行动将被世界回应'; }
function clearDraft() { const key = draftKey(); if (key) localStorage.removeItem(key); els.draftStatus.textContent = '行动将被世界回应'; }
function restoreDraft(changedGame = false) { if (!changedGame && document.activeElement === els.customAction) return; const key = draftKey(); const draft = key ? localStorage.getItem(key) || '' : ''; els.customAction.value = draft; els.draftStatus.textContent = draft ? '已恢复这本书的草稿' : '行动将被世界回应'; resizeComposer(); }

function resizeComposer() { els.customAction.style.height = 'auto'; els.customAction.style.height = `${Math.min(106, Math.max(32, els.customAction.scrollHeight))}px`; updateDockHeight(); }
function updateDockHeight() { requestAnimationFrame(() => { document.documentElement.style.setProperty('--dock-height', `${els.actionArea.offsetHeight}px`); }); }
function scrollToLatest(behavior = 'smooth') { app.followLatest = true; els.latest.hidden = true; window.scrollTo({ top:document.documentElement.scrollHeight, behavior }); }

function updateScrollIntent() {
  if (app.currentScreen !== 'story') return; app.followLatest = nearStoryBottom(); els.latest.hidden = app.followLatest || Boolean(document.body.classList.contains('reader-mode'));
}

function updateViewport() {
  const viewport = window.visualViewport; if (!viewport) return;
  const inset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop); document.documentElement.style.setProperty('--keyboard-inset', `${inset}px`);
  const keyboardOpen = viewport.height < window.innerHeight * .76 && document.activeElement === els.customAction; document.body.classList.toggle('keyboard-open', keyboardOpen); updateDockHeight();
}

function closeStoryMenu() { els.storyMenuPopover.hidden = true; els.storyMenu.setAttribute('aria-expanded','false'); els.exportOptions.hidden = true; els.exportMenu?.setAttribute('aria-expanded','false'); }
function download(format) { if (!app.game?.id) return; const link = document.createElement('a'); link.href = `${API}/games/${encodeURIComponent(app.game.id)}/export?format=${format}`; link.download = ''; document.body.append(link); link.click(); link.remove(); record('download', format); }

function toggleReader() {
  const enabled = document.body.classList.toggle('reader-mode'); els.reader.setAttribute('aria-pressed', String(enabled)); els.reader.setAttribute('aria-label', enabled ? '退出阅读模式' : '进入阅读模式'); closeStoryMenu();
  if (!enabled) { updateDockHeight(); scrollToLatest('instant'); }
}

function bindEvents() {
  $('#back-to-library').setAttribute('aria-label', '返回书库');
  els.hubTabs.forEach((tab) => tab.addEventListener('click', () => showHub(tab.dataset.hubView)));
  $$('[data-hub-view]').filter((node) => !node.classList.contains('hub-tab')).forEach((button) => button.addEventListener('click', () => showHub(button.dataset.hubView)));
  $('#brand-home').addEventListener('click', () => showHub('discover'));
  $('#open-create').addEventListener('click', () => showHub('create'));
  $('#new-game-button').addEventListener('click', async () => { if (!app.worlds.length) await refreshWorlds(); if (app.worlds[0]) openWorld(app.worlds[0]); else showHub('create'); });
  $('#back-to-library').addEventListener('click', () => showHub(app.previousHub === 'create' ? 'create' : 'discover'));
  $('#leave-story').addEventListener('click', () => { showHub('discover'); refreshLibrary(); });
  els.worldForm.addEventListener('submit', generateWorld); els.worldPrompt.addEventListener('input', () => { els.promptCount.textContent = `${els.worldPrompt.value.length} / 2000`; if (app.pendingWorld?.prompt !== els.worldPrompt.value.trim()) app.pendingWorld = null; });
  $$('.prompt-chips button').forEach((button) => button.addEventListener('click', () => { els.worldPrompt.value = button.dataset.prompt; els.worldPrompt.dispatchEvent(new Event('input')); els.worldPrompt.focus(); }));
  els.cancelWorld.addEventListener('click', cancelWorld); $('#retry-world').addEventListener('click', () => generateWorld()); $('#edit-world-prompt').addEventListener('click', () => { els.worldRecovery.hidden = true; els.worldForm.hidden = false; els.worldPrompt.focus(); });
  els.creationForm.addEventListener('submit', createGame); els.heroName.addEventListener('input', validateCreation); els.adult.addEventListener('change', validateCreation);
  els.actionForm.addEventListener('submit', (event) => { event.preventDefault(); submitTurn(); });
  els.customAction.addEventListener('compositionstart', () => { app.composing = true; }); els.customAction.addEventListener('compositionend', () => { app.composing = false; saveDraft(); });
  els.customAction.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && !app.composing) { event.preventDefault(); submitTurn(); } });
  els.customAction.addEventListener('input', () => { resizeComposer(); saveDraft(); }); els.customAction.addEventListener('focus', updateViewport); els.customAction.addEventListener('blur', () => setTimeout(updateViewport, 0));
  els.retry.addEventListener('click', retryTurn); els.latest.addEventListener('click', () => scrollToLatest());
  els.openStatus.addEventListener('click', () => openSheet('status', els.openStatus));
  els.openObservability.addEventListener('click', () => { openSheet('observability'); app.sheetTrigger = els.storyMenu; });
  $('#open-reading-settings').addEventListener('click', () => { openSheet('reading'); app.sheetTrigger = els.storyMenu; });
  els.scrim.addEventListener('click', closeSheet);
  els.storyMenu.addEventListener('click', () => { const open = els.storyMenuPopover.hidden; els.storyMenuPopover.hidden = !open; els.storyMenu.setAttribute('aria-expanded', String(open)); });
  els.exportMenu.addEventListener('click', () => { const open = els.exportOptions.hidden; els.exportOptions.hidden = !open; els.exportMenu.setAttribute('aria-expanded', String(open)); });
  els.exportOptions.addEventListener('click', (event) => { const format = event.target.dataset.export; if (format) download(format); }); els.reader.addEventListener('click', toggleReader);
  $('#theme-toggle').addEventListener('click', () => { const next = document.body.classList.contains('light') ? 'dark' : 'light'; localStorage.setItem('tgn-live-theme', next); saveReadingSettings({ theme:next }); });
  document.addEventListener('click', (event) => { if (!els.storyMenuPopover.hidden && !els.storyMenuPopover.contains(event.target) && !els.storyMenu.contains(event.target)) closeStoryMenu(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { if (app.activeSheet) closeSheet(); else closeStoryMenu(); }
    if (event.key === 'Tab' && app.activeSheet) { const items = focusableIn(app.activeSheet); if (!items.length) return; const first = items[0]; const last = items.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
  });
  window.addEventListener('scroll', updateScrollIntent, { passive:true }); window.visualViewport?.addEventListener('resize', updateViewport); window.visualViewport?.addEventListener('scroll', updateViewport);
  new ResizeObserver(updateDockHeight).observe(els.actionArea);
  window.addEventListener('offline', () => { els.connection.hidden = false; setProvider(null); }); window.addEventListener('online', refreshHealth);
  window.addEventListener('beforeunload', () => { if (app.stream && app.game?.id) navigator.sendBeacon?.(`${API}/games/${encodeURIComponent(app.game.id)}/cancel`); });
}

async function initialize() {
  applyReadingSettings(); bindEvents(); renderObservability(); updateViewport(); await Promise.all([refreshHealth(), refreshLibrary(), refreshWorlds()]);
  const params = new URLSearchParams(location.search); const requestedGame = params.get('game');
  if (requestedGame) await loadGame(requestedGame); else if (location.hash === '#new') showHub('create'); else showHub('discover');
}

initialize();
window.tgnLive = { download, refreshHealth, refreshLibrary, refreshWorlds, openWorld, showHub };
