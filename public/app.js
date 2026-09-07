import { LANGUAGE_KEY, LANGUAGES, MESSAGES, auditMessages, languageInfo, normalizeLanguage, translate } from './i18n.js';

const API = '/api';
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const safeArray = (value) => Array.isArray(value) ? value : [];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' })[char]);
const requestId = () => crypto.randomUUID?.() || `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
const initialLanguage = (() => { try { return normalizeLanguage(localStorage.getItem(LANGUAGE_KEY)); } catch { return 'zh'; } })();
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
  languageControls: [$('#home-language'), $('#story-language')],
};

const app = {
  language: initialLanguage, health: null, worlds: [], games: [], worldFilter: '__all__', selectedWorld: null, game: null, turn: null,
  stream: null, worldStream: null, pendingAction: null, pendingWorld: null, startedAt: null, timer: null,
  worldStartedAt: null, worldTimer: null, lastMetrics: null, events: [], activeSheet: null, sheetTrigger: null,
  followLatest: true, composing: false, currentScreen: 'library', previousHub: 'discover',
};

const t = (key, values = {}) => translate(app.language, key, values);
const contentLanguage = (value) => normalizeLanguage(value || 'zh');
const contentDirection = (value) => languageInfo(contentLanguage(value)).dir;
const languageName = (value) => languageInfo(contentLanguage(value)).name;
const formatDate = (value) => value ? new Intl.DateTimeFormat(languageInfo(app.language).locale, { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value)) : t('time.unknown');
const formatElapsed = (milliseconds) => {
  const locale = languageInfo(app.language).locale;
  if (milliseconds < 1000) return t('time.ms', { value:new Intl.NumberFormat(locale, { maximumFractionDigits:0 }).format(Math.max(0, Math.round(milliseconds))) });
  return t('time.sec', { value:new Intl.NumberFormat(locale, { minimumFractionDigits:milliseconds < 10000 ? 1 : 0, maximumFractionDigits:milliseconds < 10000 ? 1 : 0 }).format(milliseconds / 1000) });
};

function setText(selector, key) {
  document.querySelectorAll(selector).forEach((node) => { node.textContent = t(key); });
}

function setArrowButton(selector, key, arrow = '→', before = false) {
  const node = $(selector); if (!node) return;
  node.replaceChildren();
  const label = document.createElement('span'); label.textContent = t(key);
  const icon = document.createElement('span'); icon.className = 'directional-arrow'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = arrow;
  node.append(...(before ? [icon, label] : [label, icon]));
}

function applyStaticLanguage() {
  const info = languageInfo(app.language);
  document.documentElement.lang = info.locale; document.documentElement.dir = info.dir; document.body.dataset.language = app.language;
  document.title = t('meta.title'); $('#meta-description').content = t('meta.description');
  $('.callout-sigil').textContent = app.language === 'zh' ? '造' : '✦';
  $('.generation-orbit b').textContent = app.language === 'zh' ? '界' : '◇';
  setText('.skip-link', 'skip'); setText('.brand strong', 'brand.name'); $('#brand-home').setAttribute('aria-label', t('brand.home'));
  $('#theme-toggle').setAttribute('aria-label', t('theme.toggle')); $('#theme-toggle').title = t('theme.toggle');
  $('.connection-notice span').textContent = t('connection.message'); $('.connection-notice a').textContent = t('connection.retry');
  $('.hub-nav').setAttribute('aria-label', t('nav.aria')); setText('.hub-tab[data-hub-view="discover"]', 'nav.discover'); setText('.hub-tab[data-hub-view="create"]', 'nav.create');
  const shelfTab = $('.hub-tab[data-hub-view="shelf"]'); shelfTab.firstChild.textContent = `${t('nav.shelf')} `; els.continueCard.setAttribute('aria-label', t('continue.aria'));
  setText('.discover-intro .eyebrow', 'discover.kicker'); $('.discover-intro h1').innerHTML = t('discover.title').split('\n').map((line, index) => `${index ? '<br>' : ''}<span>${escapeHtml(line)}</span>`).join(''); setText('.discover-intro p:last-child', 'discover.lede'); setArrowButton('#new-game-button', 'discover.new');
  setText('.create-callout .eyebrow', 'create.calloutKicker'); setText('#create-callout-title', 'create.calloutTitle'); setText('.create-callout p:last-child', 'create.calloutText'); setArrowButton('#open-create', 'create.start');
  setText('.world-section .eyebrow', 'worlds.kicker'); setText('#featured-title', 'worlds.title'); setText('.world-section .section-note', 'worlds.note'); els.worldFilters.setAttribute('aria-label', t('worlds.filtersAria'));
  setArrowButton('.create-studio .back-link', 'create.back', '←', true); setText('.create-studio > .eyebrow', 'create.kicker'); setText('#create-title', 'create.title'); setText('.studio-lede', 'create.lede');
  $('label[for="world-prompt"]').textContent = t('create.promptLabel'); els.worldPrompt.placeholder = t('create.promptPlaceholder'); $('.prompt-chips').setAttribute('aria-label', t('create.examplesAria'));
  const prompts = ['beasts','stars','ninja']; $$('.prompt-chips button').forEach((button, index) => { const name = prompts[index]; button.textContent = t(`prompt.${name}.label`); button.dataset.prompt = t(`prompt.${name}`); });
  setArrowButton('#generate-world', 'create.generate'); setText('.world-generation .eyebrow', 'create.building'); if (!app.worldStream) els.worldStage.textContent = t('create.connecting'); els.cancelWorld.textContent = t('create.stop'); setText('.recovery-panel h2', 'create.failedTitle'); $('#retry-world').textContent = t('common.retry'); $('#edit-world-prompt').textContent = t('create.edit');
  setText('.shelf-page .eyebrow', 'shelf.kicker'); setText('#shelf-title', 'shelf.title'); setText('.shelf-page .text-arrow', 'shelf.discover');
  setArrowButton('#back-to-library', 'onboarding.back', '←', true); setText('.protagonist-setup > .eyebrow', 'onboarding.kicker'); setText('#onboarding-title', 'onboarding.title'); $('label[for="hero-name"]').textContent = t('onboarding.name'); els.heroName.placeholder = t('onboarding.namePlaceholder'); $('#name-hint').textContent = t('onboarding.hint'); $('#world-picker legend').textContent = t('onboarding.world'); $('#power-picker legend').textContent = t('onboarding.power'); $('.check-row span').textContent = t('onboarding.adult'); setArrowButton('#create-game-button', 'onboarding.enter');
  $('#leave-story').setAttribute('aria-label', t('story.leave')); els.reader.setAttribute('aria-label', document.body.classList.contains('reader-mode') ? t('story.readerExit') : t('story.readerEnter')); els.storyMenu.setAttribute('aria-label', t('story.more'));
  $('#story-language-label').textContent = t('language.label'); $('#open-reading-settings').textContent = t('story.reading'); els.exportMenu.textContent = t('story.export'); $('[data-export="txt"]').textContent = t('story.text'); els.openObservability.textContent = t('story.logs'); $('#story-end span').textContent = t('story.unfinished'); els.latest.textContent = t('story.latest');
  $('#actions-title').textContent = t('actions.title'); els.openStatus.textContent = t('actions.status'); $('label[for="custom-action"]').textContent = t('actions.free'); els.customAction.placeholder = t('actions.placeholder'); els.submitAction.setAttribute('aria-label', t('actions.submit')); els.retry.textContent = t('actions.retry');
  els.statusDrawer.setAttribute('aria-label', t('sheet.status')); els.readingSettings.setAttribute('aria-label', t('sheet.reading')); els.observability.setAttribute('aria-label', t('sheet.logs'));
  for (const control of els.languageControls) { control.value = app.language; control.disabled = Boolean(app.stream || app.worldStream); control.setAttribute('aria-label', t('language.label')); }
  for (const input of [els.worldPrompt, els.heroName, els.customAction]) { input.lang = info.locale; input.dir = info.dir; }
  applyReadingSettings();
}

async function setLanguage(language) {
  if (app.stream || app.worldStream) { for (const control of els.languageControls) control.value = app.language; return; }
  const next = normalizeLanguage(language); if (next === app.language) return;
  app.language = next; try { localStorage.setItem(LANGUAGE_KEY, next); } catch {}
  const selectedWorldId = app.selectedWorld?.id; const selectedPowerId = $('input[name="power"]:checked')?.value;
  app.worldFilter = '__all__'; applyStaticLanguage(); setProvider(app.health); renderLibrary(); renderWorldFilters(); renderWorlds();
  if (app.game) applyGame(app.game); else { els.draftStatus.textContent = t('actions.draftIdle'); }
  const applied = await refreshWorlds();
  if (applied && selectedWorldId) {
    const translatedWorld = app.worlds.find((world) => world.id === selectedWorldId);
    if (translatedWorld) { app.selectedWorld = translatedWorld; renderWorldPreview(translatedWorld); renderPowers(translatedWorld, selectedPowerId); }
  }
}

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
    throw new Error(t('error.login'));
  }
}

function apiError(payload = {}, status = '') {
  return app.language === 'zh' && payload.message ? payload.message : t('error.request', {status: payload.code || status});
}

async function fetchJson(path, options) {
  const response = await fetch(`${API}${path}`, options);
  checkLogin(response);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(apiError(payload, response.status));
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
  els.provider.textContent = provider?.status === 'ready' ? t('provider.ready') : available ? t('provider.available') : t('provider.unavailable');
  els.provider.className = `provider-dot ${available ? 'ok' : 'error'}`;
}

async function refreshHealth() {
  try { setProvider(await fetchJson('/health')); els.connection.hidden = true; }
  catch (error) { setProvider(null); record('health-error', error.message); }
}

function worldSource(world) {
  return world?.sourceLabel || (world?.createdAt ? t('world.sourceMine') : t('world.sourceOriginal'));
}

function worldTags(world) {
  return [...new Set([world?.genre, ...safeArray(world?.tags)].filter(Boolean))].slice(0, 4);
}

function worldGlyph(world, index = 0) {
  const title = String(world?.title || '界');
  return title.replace(/[\s·：:]/g, '').slice(0, 1) || ['山','海','城'][index % 3];
}

function renderWorldFilters() {
  const filters = ['__all__', ...new Set(app.worlds.flatMap((world) => [world.genre, ...safeArray(world.tags)]).filter(Boolean))].slice(0, 8);
  els.worldFilters.replaceChildren(...filters.map((filter) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = `filter-chip${filter === app.worldFilter ? ' active' : ''}`; button.textContent = filter === '__all__' ? t('world.all') : filter;
    button.addEventListener('click', () => { app.worldFilter = filter; renderWorldFilters(); renderWorlds(); }); return button;
  }));
}

function renderWorlds() {
  const filtered = app.worldFilter === '__all__' ? app.worlds : app.worlds.filter((world) => worldTags(world).includes(app.worldFilter));
  if (!filtered.length) { els.worldGrid.innerHTML = `<p class="empty-state">${escapeHtml(t('world.emptyFilter'))}</p>`; return; }
  els.worldGrid.replaceChildren(...filtered.map((world, index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'world-card'; button.dataset.worldId = world.id;
    const language = contentLanguage(world.language); const dir = contentDirection(language);
    button.setAttribute('aria-label', t('world.view', { title:world.title || t('world.unnamed') }));
    button.innerHTML = `<span class="world-art" data-glyph="${escapeHtml(worldGlyph(world,index))}"><span class="world-label" lang="${language}" dir="${dir}">${escapeHtml(worldSource(world))}</span></span><span class="world-body" lang="${language}" dir="${dir}"><span class="world-subtitle">${escapeHtml(world.subtitle || world.genre || t('world.growth'))}</span><h3>${escapeHtml(world.title || t('world.unnamed'))}</h3><span class="world-description">${escapeHtml(world.description || t('world.fallback'))}</span><span class="tag-row">${worldTags(world).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</span><small class="content-language">${escapeHtml(t('library.language', { language:languageName(language) }))}</small></span>`;
    button.addEventListener('click', () => openWorld(world)); return button;
  }));
}

async function refreshWorlds() {
  const requestedLanguage = app.language;
  els.worldError.hidden = true;
  try {
    const payload = await fetchJson(`/worlds?language=${encodeURIComponent(requestedLanguage)}`);
    if (requestedLanguage !== app.language) return false;
    app.worlds = safeArray(payload.worlds); app.worldFilter = '__all__';
    renderWorldFilters(); renderWorlds();
    if (!app.worlds.length) els.worldGrid.innerHTML = `<p class="empty-state">${escapeHtml(t('world.none'))}</p>`;
    return true;
  } catch (error) {
    if (requestedLanguage !== app.language) return false;
    els.worldGrid.innerHTML = '';
    els.worldError.hidden = false;
    els.worldError.innerHTML = `${escapeHtml(t('world.loadError', { message:error.message }))} <button type="button">${escapeHtml(t('common.reload'))}</button>`;
    els.worldError.querySelector('button').addEventListener('click', refreshWorlds);
    record('worlds-load-error', error.message);
    return false;
  }
}

function renderLibrary() {
  els.gameCount.textContent = app.games.length ? String(app.games.length) : '';
  if (!app.games.length) {
    els.libraryList.innerHTML = `<p class="empty-state">${escapeHtml(t('library.empty'))}</p>`;
    els.continueCard.hidden = true; return;
  }
  const latest = app.games[0];
  els.continueCard.hidden = false;
  const latestLanguage = contentLanguage(latest.language); const latestDir = contentDirection(latestLanguage);
  els.continueCard.innerHTML = `<span class="continue-seal" aria-hidden="true">↻</span><div lang="${latestLanguage}" dir="${latestDir}"><h2>${escapeHtml(latest.title || `${latest.name || t('library.unnamed')} · ${t('library.scroll')}`)}</h2><p>${escapeHtml(latest.name || t('library.unnamed'))} · ${escapeHtml(latest.realm?.name || t('library.bodyFallback'))} · ${escapeHtml(t('library.turn', { number:latest.turnNumber ?? 0 }))}</p><small class="content-language">${escapeHtml(t('library.language', { language:languageName(latestLanguage) }))}</small></div><button type="button">${escapeHtml(t('library.continue'))}</button>`;
  els.continueCard.querySelector('button').addEventListener('click', () => loadGame(latest.id));
  els.libraryList.replaceChildren(...app.games.map((game) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'library-card'; button.dataset.gameId = game.id;
    const language = contentLanguage(game.language); const dir = contentDirection(language);
    button.innerHTML = `<span lang="${language}" dir="${dir}"><span class="book-kicker">${escapeHtml(game.realm?.name || t('library.bodyFallback'))} · ${escapeHtml(t('library.turn', { number:game.turnNumber ?? 0 }))}</span><h3>${escapeHtml(game.title || `${game.name || t('library.unnamed')} · ${t('library.scroll')}`)}</h3><p>${escapeHtml(game.name || t('library.unnamed'))} · <bdi>${escapeHtml(formatDate(game.updatedAt))}</bdi></p></span><small class="content-language">${escapeHtml(t('library.language', { language:languageName(language) }))}</small><footer><span>${escapeHtml(t('library.continue'))}</span><span class="directional-arrow" aria-hidden="true">→</span></footer>`;
    button.addEventListener('click', () => loadGame(game.id)); return button;
  }));
}

async function refreshLibrary() {
  try { const payload = await fetchJson('/games'); app.games = safeArray(payload.games).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt)); renderLibrary(); }
  catch (error) { els.libraryList.innerHTML = `<p class="empty-state">${escapeHtml(t('library.loadError', { message:error.message }))}</p>`; els.continueCard.hidden = true; record('library-error', error.message); }
}

function normalizedPowerSystem(world) {
  const system = world?.powerSystem || {};
  return { summary:system.summary || t('world.powerSummary'), growth:system.growth || t('world.powerGrowth'), realms:safeArray(system.realms) };
}

function renderWorldPreview(world) {
  const system = normalizedPowerSystem(world); const tags = worldTags(world);
  const language = contentLanguage(world.language); const dir = contentDirection(language);
  els.worldPreview.innerHTML = `<div lang="${language}" dir="${dir}"><p class="eyebrow">${escapeHtml(worldSource(world))}</p><h1>${escapeHtml(world.title || t('world.unnamed'))}</h1><p class="preview-subtitle">${escapeHtml(world.subtitle || tags.join(' · ') || t('world.destiny'))}</p><p class="preview-description">${escapeHtml(world.description || t('world.previewFallback'))}</p><div class="tag-row">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div><small class="content-language">${escapeHtml(t('library.language', { language:languageName(language) }))}</small></div><section class="power-system" lang="${language}" dir="${dir}"><p class="eyebrow">${escapeHtml(t('world.powerHeading'))}</p><h2>${escapeHtml(system.summary)}</h2>${system.realms.length ? `<div class="realm-path">${system.realms.slice(0,7).map((realm) => `<span>${escapeHtml(realm.name || realm)}</span>`).join('')}</div>` : ''}<p>${escapeHtml(system.growth)}</p></section>`;
}

function openWorld(world) {
  if (!world) return;
  app.selectedWorld = world; renderWorldPreview(world);
  els.worldOptions.innerHTML = `<label><input type="radio" name="world" value="${escapeHtml(world.id)}" checked />${escapeHtml(world.title || t('world.current'))}</label>`;
  renderPowers(world); validateCreation(); showScreen('onboarding'); setTimeout(() => els.heroName.focus(), 0);
}

function renderPowers(world, preferredPowerId = $('input[name="power"]:checked')?.value) {
  const powers = safeArray(world?.powers); els.powerPicker.disabled = !powers.length;
  if (!powers.length) { els.powerOptions.innerHTML = `<p class="empty-state">${escapeHtml(t('world.noPowers'))}</p>`; validateCreation(); return; }
  const selectedPowerId = powers.some((power) => power.id === preferredPowerId) ? preferredPowerId : powers[0]?.id;
  els.powerOptions.replaceChildren(...powers.map((power, index) => {
    const label = document.createElement('label'); label.className = 'power-card';
    label.dataset.selectedLabel = t('world.selected'); label.dataset.selectLabel = t('world.select');
    label.innerHTML = `<input type="radio" name="power" value="${escapeHtml(power.id)}" ${power.id === selectedPowerId ? 'checked' : ''}/><h3>${escapeHtml(power.name || t('world.powerUnnamed'))}</h3><p>${escapeHtml(power.description || t('world.powerFallback'))}</p>`;
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
  const special = { processing:'turn.processing', not_canon:'turn.notCanon', cancelled:'world.cancelledShort', cancel_pending:'turn.cancelPending' };
  return special[name] ? t(special[name]) : MESSAGES.zh[`stage.${name}`] ? t(`stage.${name}`) : (String(name || '').startsWith('acp_') ? t('stage.acp') : name || t('stage.sent'));
}

async function consumeSse(response, onEvent, isActive) {
  checkLogin(response, 'text/event-stream');
  if (!response.ok) { const payload = await response.json().catch(() => ({})); throw new Error(apiError(payload, response.status)); }
  if (!response.body) throw new Error(t('error.stream'));
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''; let eventName = 'message'; let dataLines = [];
  const dispatch = () => { if (!dataLines.length) return; const raw = dataLines.join('\n'); let data; try { data = JSON.parse(raw); } catch { data = { message:raw }; } onEvent(eventName, data); eventName = 'message'; dataLines = []; };
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buffer += decoder.decode(value, { stream:true }); const lines = buffer.split(/\r?\n/); buffer = lines.pop() || '';
    for (const line of lines) { if (!line) dispatch(); else if (line.startsWith('event:')) eventName = line.slice(6).trim(); else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart()); }
  }
  dispatch(); if (isActive()) throw new Error(t('error.streamEnded'));
}

function renderWorldGeneration() {
  if (!app.worldStream || !app.worldStartedAt) { els.worldGeneration.hidden = true; clearInterval(app.worldTimer); app.worldTimer = null; for (const control of els.languageControls) control.disabled = Boolean(app.stream); return; }
  const elapsed = Math.max(Date.now() - app.worldStartedAt, app.pendingWorld?.reportedElapsed || 0);
  els.worldGeneration.hidden = false; els.worldStage.textContent = stageLabel(app.pendingWorld?.stage); els.worldElapsed.textContent = `${t('create.elapsed', { time:formatElapsed(elapsed) })} · ${t('stage.realOnly')}`;
  for (const control of els.languageControls) control.disabled = true;
}

function failWorld(message, details = {}) {
  app.worldStream = null; app.worldStartedAt = null; renderWorldGeneration();
  els.worldRecovery.hidden = false; els.worldErrorMessage.textContent = details.code === 'cancelled' ? t('world.cancelled') : message;
  els.worldForm.hidden = false; els.generateWorld.disabled = false;
  for (const control of els.languageControls) control.disabled = false;
  record('world-error', `${details.code || 'unknown'} · ${message}`);
}

async function generateWorld(event) {
  event?.preventDefault(); const prompt = els.worldPrompt.value.trim(); if (!prompt || app.worldStream) return;
  els.worldRecovery.hidden = true; els.worldForm.hidden = true; els.generateWorld.disabled = true;
  app.pendingWorld = { prompt, language:app.language, requestId:app.pendingWorld?.prompt === prompt && app.pendingWorld?.language === app.language ? app.pendingWorld.requestId : requestId(), stage:'validating', reportedElapsed:0 };
  app.worldStartedAt = Date.now(); app.worldStream = new AbortController(); renderWorldGeneration(); app.worldTimer = setInterval(renderWorldGeneration, 250);
  record('world-request', prompt.slice(0,80));
  try {
    const response = await fetch(`${API}/worlds/custom`, { method:'POST', headers:{Accept:'text/event-stream','Content-Type':'application/json'}, body:JSON.stringify({ prompt, requestId:app.pendingWorld.requestId, language:app.pendingWorld.language }), signal:app.worldStream.signal });
    await consumeSse(response, (name, data) => {
      if (name === 'stage') { app.pendingWorld.stage = data?.name || 'world_generation'; app.pendingWorld.reportedElapsed = Number(data?.elapsedMs) || 0; renderWorldGeneration(); record(`world-stage:${app.pendingWorld.stage}`, data?.status || ''); }
      if (name === 'complete') {
        const world = data?.world; if (!world?.id) return failWorld(t('world.invalidResult'), { code:'invalid_result' });
        app.worldStream = null; app.worldStartedAt = null; renderWorldGeneration(); app.pendingWorld = null;
        app.worlds = [world, ...app.worlds.filter((item) => item.id !== world.id)]; renderWorldFilters(); renderWorlds(); record('world-complete', world.id); openWorld(world);
      }
      if (name === 'error') failWorld(data?.message ? apiError(data) : t('world.failed'), data || {});
    }, () => Boolean(app.worldStream));
  } catch (error) {
    if (error.name === 'AbortError') return;
    failWorld(error.message, { code:'network', retryable:true });
  }
}

function cancelWorld() {
  if (!app.worldStream) return;
  const controller = app.worldStream; app.worldStream = null; controller.abort(); app.worldStartedAt = null; renderWorldGeneration();
  failWorld(t('world.cancelledShort'), { code:'cancelled', retryable:true });
}

async function createGame(event) {
  event.preventDefault(); els.creationError.textContent = ''; validateCreation();
  if (els.createGame.disabled) { els.creationError.textContent = t('onboarding.invalid'); return; }
  const body = { name:els.heroName.value.trim(), worldId:$('input[name="world"]:checked')?.value, powerId:$('input[name="power"]:checked')?.value, language:app.language };
  els.createGame.disabled = true; els.createGame.textContent = t('onboarding.creating');
  try {
    const payload = await fetchJson('/games', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    applyGame(payload.game, { initial:true }); showScreen('story'); record('game-created', payload.game?.id || 'id missing'); await submitTurn(t('action.startStory'));
  } catch (error) { els.creationError.textContent = error.message; record('game-create-error', error.message); }
  finally { setArrowButton('#create-game-button', 'onboarding.enter'); validateCreation(); }
}

function stateCardHtml(state = {}) {
  const realm = state.realm || {}; const progress = Number(realm.progress); const meter = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : 0;
  const inventory = safeArray(state.inventory); const relationships = safeArray(state.relationships); const facts = safeArray(state.facts); const currency = state.currencyName || t('status.currency');
  const stateLanguage = contentLanguage(app.game?.language); const stateDir = contentDirection(stateLanguage);
  const currentPower = safeArray(state.capabilities).find(ability => ability.id === `power-${state.power?.id}`) || state.power;
  const abilities = safeArray(state.capabilities).filter(ability => ability.id !== `power-${state.power?.id}`);
  const powerDetails = `${realm.benchmark ? `<section class="status-summary"><h3>${escapeHtml(t('status.realmMeaning'))}</h3><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(realm.benchmark)}</p><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(realm.unlock || '')}</p></section>` : ''}${abilities.length ? `<section class="status-summary"><h3>${escapeHtml(t('status.abilities'))}</h3>${abilities.map(ability => `<h4 lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(ability.name)}</h4><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(ability.description)}</p>`).join('')}</section>` : ''}`;
  const itemList = inventory.length ? `<ul lang="${stateLanguage}" dir="${stateDir}">${inventory.slice(0,8).map((item) => `<li>${escapeHtml(item?.name || t('status.itemUnnamed'))}${item?.qty ? ` ×<bdi>${escapeHtml(item.qty)}</bdi>` : ''}${item?.description ? `<small class="item-description">${escapeHtml(item.description)}</small>` : ''}</li>`).join('')}</ul>` : `<p>${escapeHtml(t('status.itemsEmpty'))}</p>`;
  const npcList = relationships.length ? `<ul lang="${stateLanguage}" dir="${stateDir}">${relationships.slice(0,8).map((npc) => { const attitudeKey = `enum.${npc?.attitude}`; const attitude = npc?.attitude && MESSAGES.zh[attitudeKey] ? t(attitudeKey) : npc?.attitude; return `<li>${escapeHtml(npc?.name || t('status.personUnnamed'))}${npc?.role ? ` · ${escapeHtml(npc.role)}` : ''}${attitude ? ` (${escapeHtml(attitude)})` : ''}</li>`; }).join('')}</ul>` : `<p>${escapeHtml(t('status.peopleEmpty'))}</p>`;
  return `<section class="status-summary"><h3>${escapeHtml(t('status.realm'))}</h3><h2 lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(realm.name || t('status.realmUnknown'))}</h2><p>${realm.rank !== undefined ? t('status.rank', { rank:`<bdi>${escapeHtml(realm.rank)}</bdi>` }) : t('status.rankUnknown')} · ${Number.isFinite(progress) ? t('status.progress', { progress:`<bdi>${meter}</bdi>` }) : t('status.progressUnknown')}</p><div class="realm-meter" aria-label="${escapeHtml(t('status.progressAria', { progress:meter }))}"><i style="width:${meter}%"></i></div></section><section class="status-summary"><h3>${escapeHtml(t('status.power'))}</h3><h2 lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(currentPower?.name || t('status.notRecorded'))}</h2><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(currentPower?.description || '')}</p></section>${powerDetails}<section class="status-summary"><h3>${escapeHtml(t('status.location'))}</h3><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(state.location || t('status.locationUnknown'))}</p></section><section class="status-summary"><h3 lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(currency)}</h3><p>${state.coins === undefined || state.coins === null ? escapeHtml(t('status.notRecorded')) : `<bdi>${escapeHtml(state.coins)}</bdi>`}</p></section><section class="status-summary"><h3>${escapeHtml(t('status.goal'))}</h3><p lang="${stateLanguage}" dir="${stateDir}">${escapeHtml(state.goal || t('status.goalEmpty'))}</p></section><section class="status-summary"><h3>${escapeHtml(t('status.items'))}</h3>${itemList}</section><section class="status-summary"><h3>${escapeHtml(t('status.people'))}</h3>${npcList}</section>${facts.length ? `<section class="status-summary"><h3>${escapeHtml(t('status.facts'))}</h3><ul lang="${stateLanguage}" dir="${stateDir}">${facts.slice(-6).map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul></section>` : ''}`;
}

function renderStatus() {
  const markup = stateCardHtml(app.game?.state || {}); els.statusRail.innerHTML = markup;
  els.statusDrawer.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>${escapeHtml(t('sheet.status'))}</h2><button class="sheet-close" type="button" aria-label="${escapeHtml(t('sheet.closeStatus'))}">×</button></header><div class="sheet-grid">${markup}</div>`;
  els.statusDrawer.querySelector('.sheet-close').addEventListener('click', closeSheet);
}

function nearStoryBottom() {
  return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) < Math.max(260, els.actionArea.offsetHeight + 80);
}

function renderNarrative(options = {}) {
  const shouldFollow = options.forceLatest || app.followLatest || nearStoryBottom(); const turns = safeArray(app.game?.turns);
  els.narrative.innerHTML = turns.map((turn) => { const language = contentLanguage(turn.language); const dir = contentDirection(language); return `<section class="turn-block" data-turn-language="${language}"><p class="turn-meta">${t('turn.meta', { number:`<bdi>${escapeHtml(turn.index || '?')}</bdi>`, date:`<bdi>${escapeHtml(formatDate(turn.createdAt))}</bdi>` })}</p>${turnText(turn).split(/\n{2,}/).filter(Boolean).map((paragraph) => `<p lang="${language}" dir="${dir}">${escapeHtml(paragraph)}</p>`).join('')}${turn.action && turn.index > 1 ? `<span class="turn-action" lang="${language}" dir="${dir}">${escapeHtml(t('turn.action', { action:turn.action }))}</span>` : ''}</section>`; }).join('') || `<p class="awaiting">${escapeHtml(t('turn.awaiting'))}</p>`;
  if (app.pendingAction) { const language = contentLanguage(app.pendingAction.language); const dir = contentDirection(language); els.narrative.insertAdjacentHTML('beforeend', `<section class="turn-block provisional" id="provisional-turn" data-turn-language="${language}"><span class="provisional-label">${escapeHtml(t('turn.provisional'))}</span><p lang="${language}" dir="${dir}">${escapeHtml(app.pendingAction.text || t('turn.waiting'))}</p></section>`); }
  els.storyEnd.hidden = Boolean(app.pendingAction) || !turns.length;
  if (shouldFollow) requestAnimationFrame(() => scrollToLatest('instant'));
}

function renderActions() {
  const choices = safeArray(app.turn?.choices); const disabled = Boolean(app.stream);
  els.turnCounter.textContent = app.game?.state?.turnNumber !== undefined ? t('library.turn', { number:app.game.state.turnNumber }) : '';
  const choiceLanguage = contentLanguage(app.turn?.language); const choiceDir = contentDirection(choiceLanguage);
  els.suggestions.replaceChildren(...choices.slice(0,3).map((choice,index) => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'suggestion'; button.disabled = disabled;
    button.innerHTML = `<b>${escapeHtml(t('turn.choice', { number:index + 1 }))}</b><span lang="${choiceLanguage}" dir="${choiceDir}">${escapeHtml(choice?.label || t('turn.choiceUnnamed'))}</span>`; button.addEventListener('click', () => submitTurn(choice?.label || '')); return button;
  }));
  if (!choices.length && !app.stream) els.suggestions.innerHTML = `<p class="empty-state">${escapeHtml(t('turn.writeOwn'))}</p>`;
  els.customAction.disabled = disabled; els.submitAction.disabled = disabled; els.retry.disabled = disabled;
  for (const control of els.languageControls) control.disabled = disabled || Boolean(app.worldStream);
}

function renderGeneration() {
  if (!app.stream || !app.startedAt) { els.generation.hidden = true; els.narrative.setAttribute('aria-busy','false'); clearInterval(app.timer); app.timer = null; updateDockHeight(); return; }
  const elapsed = Math.max(Date.now() - app.startedAt, app.pendingAction?.reportedElapsed || 0); els.narrative.setAttribute('aria-busy','true'); els.generation.hidden = false;
  els.generation.innerHTML = `<span><i class="stage-pulse"></i><strong>${escapeHtml(stageLabel(app.pendingAction?.stage))}</strong> · <bdi>${escapeHtml(formatElapsed(elapsed))}</bdi></span><button type="button" class="stop-button" id="stop-turn">${escapeHtml(t('turn.stop'))}</button>`;
  $('#stop-turn').addEventListener('click', cancelTurn); updateDockHeight();
}

function renderObservability() {
  const metrics = app.lastMetrics || app.turn?.metrics || {}; const rows = app.events.map((event) => `<li><strong><bdi>${escapeHtml(event.name)}</bdi></strong>${escapeHtml(event.details || '—')}<br><small><bdi>${escapeHtml(formatDate(event.at))}</bdi></small></li>`).join('');
  const model = `<bdi dir="ltr">${escapeHtml(app.health?.provider?.model || t('logs.modelMissing'))}</bdi>`; const elapsed = metrics.totalElapsedMs == null && metrics.totalMs == null ? escapeHtml(t('logs.notReported')) : `<bdi>${escapeHtml(formatElapsed(metrics.totalElapsedMs ?? metrics.totalMs))}</bdi>`;
  els.observability.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>${escapeHtml(t('sheet.logs'))}</h2><button class="sheet-close" type="button" aria-label="${escapeHtml(t('sheet.closeLogs'))}">×</button></header><p>${escapeHtml(t('logs.note'))}</p><p>${t('logs.model', { model })}<br>${t('logs.total', { time:elapsed })}</p><ul class="observability-list">${rows || `<li>${escapeHtml(t('logs.none'))}</li>`}</ul>`;
  els.observability.querySelector('.sheet-close').addEventListener('click', closeSheet);
}

function renderReadingSettings() {
  const settings = readReadingSettings();
  els.readingSettings.innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><header class="sheet-header"><h2>${escapeHtml(t('sheet.reading'))}</h2><button class="sheet-close" type="button" aria-label="${escapeHtml(t('sheet.closeReading'))}">×</button></header><div class="setting-row"><label for="font-size-setting"><span>${escapeHtml(t('reading.font'))}</span><span id="font-size-value"><bdi>${settings.fontSize}px</bdi></span></label><input id="font-size-setting" type="range" min="16" max="24" step="1" value="${settings.fontSize}" /></div><div class="setting-row"><label for="line-height-setting"><span>${escapeHtml(t('reading.leading'))}</span><span id="line-height-value"><bdi>${settings.lineHeight.toFixed(2)}</bdi></span></label><input id="line-height-setting" type="range" min="1.7" max="2.4" step="0.05" value="${settings.lineHeight}" /></div><div class="setting-row"><span>${escapeHtml(t('reading.background'))}</span><div class="setting-buttons"><button type="button" data-reader-theme="dark">${escapeHtml(t('reading.dark'))}</button><button type="button" data-reader-theme="light">${escapeHtml(t('reading.light'))}</button><button type="button" data-reader-theme="system">${escapeHtml(t('reading.system'))}</button></div></div>`;
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
  document.documentElement.style.setProperty('--reader-size', `${settings.fontSize}px`); document.documentElement.style.setProperty('--reader-leading', settings.lineHeight); document.documentElement.style.setProperty('--reader-leading-effective', app.language === 'zh' ? settings.lineHeight : Math.min(settings.lineHeight, 1.85));
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
  const gameLanguage = contentLanguage(game?.language); const gameDir = contentDirection(gameLanguage);
  els.storyTitle.textContent = game?.title || `${game?.name || t('library.unnamed')} · ${t('library.scroll')}`; els.storyTitle.lang = gameLanguage; els.storyTitle.dir = gameDir;
  els.storyLocation.textContent = game?.state?.location || t('story.locationUnknown'); els.storyLocation.lang = gameLanguage; els.storyLocation.dir = gameDir;
  renderStatus(); renderNarrative({ forceLatest:options.initial || changedGame }); renderActions(); renderObservability(); restoreDraft(changedGame);
}

async function loadGame(id) {
  try { const payload = await fetchJson(`/games/${encodeURIComponent(id)}`); applyGame(payload.game, { initial:true }); showScreen('story'); history.replaceState(null, '', `${location.pathname}?game=${encodeURIComponent(id)}`); requestAnimationFrame(() => scrollToLatest('instant')); record('game-loaded', id); }
  catch (error) { toast(t('game.openError', { message:error.message })); record('game-load-error', error.message); }
}

function updateProvisional(text) {
  if (!app.pendingAction) return; app.pendingAction.text = `${app.pendingAction.text || ''}${text}`;
  const node = $('#provisional-turn p'); if (node) node.textContent = app.pendingAction.text || t('turn.waiting');
  if (app.followLatest) requestAnimationFrame(() => scrollToLatest('smooth'));
}

function showGrowth(changes) {
  const items = safeArray(changes).filter(Boolean); if (!items.length) return;
  const language = contentLanguage(app.turn?.language); const dir = contentDirection(language);
  els.growth.hidden = false; els.growth.innerHTML = `<button type="button" aria-label="${escapeHtml(t('growth.close'))}">×</button><h2>${escapeHtml(t('growth.title'))}</h2><ul lang="${language}" dir="${dir}">${items.slice(0,6).map((change) => `<li>${escapeHtml(change)}</li>`).join('')}</ul>`;
  els.growth.querySelector('button').addEventListener('click', () => { els.growth.hidden = true; }); setTimeout(() => { els.growth.hidden = true; }, 7000);
}

function handleTurnEvent(name, data) {
  if (name === 'stage') { app.pendingAction.stage = data?.name || 'processing'; app.pendingAction.reportedElapsed = Number(data?.elapsedMs) || 0; record(`stage:${app.pendingAction.stage}`, data?.status || ''); renderGeneration(); return; }
  if (name === 'text') { const delta = data?.delta || ''; if (delta) { if (!app.pendingAction.firstVisibleAt) { app.pendingAction.firstVisibleAt = Date.now(); record('first-visible-narrative', `${app.pendingAction.firstVisibleAt - app.startedAt}ms`); } updateProvisional(delta); } return; }
  if (name === 'complete') {
    const elapsed = Date.now() - app.startedAt; record('complete', `${elapsed}ms`); app.turn = data?.turn || null; app.game = data?.game || app.game; app.lastMetrics = data?.metrics || app.turn?.metrics || null;
    if (app.turn) app.turn.metrics = app.lastMetrics || app.turn.metrics; const changes = app.turn?.changes; app.pendingAction = null; app.stream = null; app.startedAt = null; clearDraft(); applyGame(app.game); renderGeneration(); renderActions(); refreshLibrary(); showGrowth(changes); toast(t('turn.saved')); return;
  }
  if (name === 'error') failTurn(data?.message ? apiError(data) : t('turn.failed'), data);
}

async function submitTurn(action) {
  const text = String(action || els.customAction.value || '').trim(); if (!text || !app.game?.id || app.stream) return;
  const shouldFollow = app.followLatest || nearStoryBottom();
  els.turnError.textContent = ''; els.retry.hidden = true; clearDraft(); els.customAction.value = ''; resizeComposer(); app.followLatest = shouldFollow;
  app.pendingAction = { text:'', action:text, language:app.language, stage:'validating', requestId:requestId(), reportedElapsed:0 }; app.startedAt = Date.now(); app.stream = new AbortController(); record('action-click', text.slice(0,80)); renderNarrative({ forceLatest:shouldFollow }); renderActions(); renderGeneration(); app.timer = setInterval(renderGeneration, 250);
  try {
    const response = await fetch(`${API}/games/${encodeURIComponent(app.game.id)}/turns`, { method:'POST', headers:{Accept:'text/event-stream','Content-Type':'application/json'}, body:JSON.stringify({ action:text, expectedVersion:app.game.version, requestId:app.pendingAction.requestId, language:app.pendingAction.language }), signal:app.stream.signal });
    await consumeSse(response, handleTurnEvent, () => Boolean(app.stream));
  } catch (error) { if (error.name === 'AbortError') return; failTurn(error.message, { code:'network', retryable:true }); }
}

function failTurn(message, details = {}) {
  record('turn-error', `${details.code || 'unknown'} · ${message}`); app.stream = null; app.startedAt = null;
  if (app.pendingAction) { app.pendingAction.stage = 'not_canon'; saveDraft(app.pendingAction.action); }
  els.turnError.textContent = message; els.retry.hidden = !app.pendingAction?.action; renderGeneration(); renderNarrative(); renderActions();
}

async function cancelTurn() {
  const gameId = app.game?.id; if (!gameId || !app.stream) return;
  const previousVersion = app.game.version; const controller = app.stream; const pending = app.pendingAction; app.stream = null; controller.abort(); app.startedAt = null; record('cancel-click', gameId);
  try {
    const payload = await fetchJson(`/games/${encodeURIComponent(gameId)}/cancel`, { method:'POST' }); const current = await fetchJson(`/games/${encodeURIComponent(gameId)}`);
    if (current.game.version > previousVersion) { app.pendingAction = null; clearDraft(); applyGame(current.game); els.turnError.textContent = t('turn.cancelWon'); els.retry.hidden = true; }
    else { app.pendingAction = pending ? { ...pending, text:'', stage:payload.cancelled ? 'cancelled' : 'cancel_pending' } : null; saveDraft(pending?.action || ''); applyGame(current.game); els.turnError.textContent = payload.cancelled ? t('turn.cancelled') : t('turn.cancelPending'); els.retry.hidden = !pending?.action; }
  } catch (error) { saveDraft(pending?.action || ''); els.turnError.textContent = t('turn.cancelUnknown', { message:error.message }); els.retry.hidden = !pending?.action; }
  finally { renderGeneration(); renderNarrative(); renderActions(); }
}

async function retryTurn() {
  const action = app.pendingAction?.action || els.customAction.value.trim(); if (!action || !app.game?.id || app.stream) return;
  try {
    const previousVersion = app.game.version; const result = await fetchJson(`/games/${encodeURIComponent(app.game.id)}`);
    if (result.game.version > previousVersion) { app.pendingAction = null; clearDraft(); applyGame(result.game); els.turnError.textContent = t('turn.restored'); els.retry.hidden = true; return; }
    app.pendingAction = null; applyGame(result.game); await submitTurn(action);
  } catch (error) { els.turnError.textContent = t('turn.checkError', { message:error.message }); }
}

function draftKey() { return app.game?.id ? `tgn-live-draft:${app.game.id}` : null; }
function saveDraft(value = els.customAction.value) { const key = draftKey(); if (!key) return; const text = String(value || ''); text ? localStorage.setItem(key, text) : localStorage.removeItem(key); els.draftStatus.textContent = text ? t('draft.saved') : t('actions.draftIdle'); }
function clearDraft() { const key = draftKey(); if (key) localStorage.removeItem(key); els.draftStatus.textContent = t('actions.draftIdle'); }
function restoreDraft(changedGame = false) { if (!changedGame && document.activeElement === els.customAction) return; const key = draftKey(); const draft = key ? localStorage.getItem(key) || '' : ''; els.customAction.value = draft; els.draftStatus.textContent = draft ? t('draft.restored') : t('actions.draftIdle'); resizeComposer(); }

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
  const enabled = document.body.classList.toggle('reader-mode'); els.reader.setAttribute('aria-pressed', String(enabled)); els.reader.setAttribute('aria-label', enabled ? t('story.readerExit') : t('story.readerEnter')); closeStoryMenu();
  if (!enabled) { updateDockHeight(); scrollToLatest('instant'); }
}

function bindEvents() {
  $('#back-to-library').setAttribute('aria-label', t('onboarding.back'));
  els.languageControls.forEach((control) => control.addEventListener('change', () => { void setLanguage(control.value); }));
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
  applyStaticLanguage(); bindEvents(); renderObservability(); updateViewport(); await Promise.all([refreshHealth(), refreshLibrary(), refreshWorlds()]);
  const params = new URLSearchParams(location.search); const requestedGame = params.get('game');
  if (requestedGame) await loadGame(requestedGame); else if (location.hash === '#new') showHub('create'); else showHub('discover');
}

initialize();
window.tgnLive = { download, refreshHealth, refreshLibrary, refreshWorlds, openWorld, showHub, setLanguage, auditMessages, get language() { return app.language; } };
