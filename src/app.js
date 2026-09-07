import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { performance } from "node:perf_hooks";
import { AppError, publicError } from "./errors.js";
import { createId } from "./ids.js";
import { TurnTrace } from "./telemetry.js";
import { createSeedState, getPower, publicWorld, publicWorldsForLanguage } from "./worlds.js";
import { createRequestGuard } from './access.js';
import { localizedGameTitle, normalizeLanguage } from "./i18n.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export function createApp({ config, store, generationService, worldForge }) {
  const inFlight = new Map();
  const worldInFlight = new Map();
  const guard = createRequestGuard(config.remote);

  const server = createServer(async (request, response) => {
    const receivedMono = performance.now();
    const receivedAt = new Date().toISOString();
    try {
      const url = new URL(request.url, `http://${request.headers.host || `${config.host}:${config.port}`}`);
      await guard(request);
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'same-origin');
      if (request.method === "GET" && url.pathname === "/api/health") {
        const health = generationService.providerHealth();
        return sendJson(response, 200, {
          ok: true,
          version: config.version,
          access: { mode: config.remote ? 'owner-only' : 'local-only', publicUrl: config.remote?.publicUrl || null },
          architecture: { openingPlanStrategy: config.openingPlanStrategy, plannerInterval: config.plannerInterval, chapterTurns: config.chapterTurns },
          provider: {
            name: "AgentDock ACP",
            model: config.narratorModel,
            status: health.status,
            configuration: {
              narrator: { model: config.narratorModel, reasoningEffort: config.narratorReasoning },
              planner: { model: config.plannerModel, reasoningEffort: config.plannerReasoning },
              player: { model: config.playerModel, reasoningEffort: config.playerReasoning },
              judge: { model: config.judgeModel, reasoningEffort: config.judgeReasoning },
              world: { model: config.worldModel, reasoningEffort: config.worldReasoning },
              mode: "read-only",
              acpPromptConcurrencyLimit: 2,
            },
            ...(health.warning ? { warning: health.warning } : {}),
          },
          limitations: ["private single-owner prototype; home PC must remain awake", "read-only ACP mode is not a hostile multi-tenant sandbox guarantee", "AI illustrations are not implemented"],
        });
      }
      if (request.method === "GET" && url.pathname === "/api/worlds") {
        const language = normalizeLanguage(url.searchParams.get("language") || undefined);
        return sendJson(response, 200, { worlds: publicWorldsForLanguage(store.listWorlds(), language) });
      }
      if (request.method === "POST" && url.pathname === "/api/worlds/custom") {
        return await handleWorld({ request, response });
      }
      if (request.method === "GET" && url.pathname === "/api/games") {
        return sendJson(response, 200, { games: store.listGames() });
      }
      if (request.method === "POST" && url.pathname === "/api/games") {
        const body = await readJson(request);
        const language = normalizeLanguage(body.language);
        const name = validateName(body.name);
        const world = store.getWorld(body.worldId, language);
        const power = getPower(world, body.powerId);
        if (!world || !power) throw new AppError("世界或异能不存在", { code: "INVALID_GAME_SELECTION", status: 400 });
        const game = store.createGame({
          name,
          title: localizedGameTitle(name, world.title, language),
          worldId: world.id,
          powerId: power.id,
          world,
          state: createSeedState(world, power),
          language,
        });
        return sendJson(response, 201, { game });
      }

      const gameMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
      if (request.method === "GET" && gameMatch) {
        const game = store.getGame(decodeURIComponent(gameMatch[1]));
        if (!game) throw new AppError("找不到这段故事", { code: "GAME_NOT_FOUND", status: 404 });
        return sendJson(response, 200, { game });
      }

      const turnsMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/turns$/);
      if (request.method === "POST" && turnsMatch) {
        return await handleTurn({ request, response, gameId: decodeURIComponent(turnsMatch[1]), receivedMono, receivedAt });
      }

      const cancelMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/cancel$/);
      if (request.method === "POST" && cancelMatch) {
        const gameId = decodeURIComponent(cancelMatch[1]);
        const active = inFlight.get(gameId);
        if (active) active.controller.abort(new Error("cancelled by user"));
        return sendJson(response, 200, { cancelled: Boolean(active) });
      }

      const exportMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/export$/);
      if (request.method === "GET" && exportMatch) {
        const gameId = decodeURIComponent(exportMatch[1]);
        const format = url.searchParams.get("format") || "md";
        if (!new Set(["md", "txt"]).has(format)) throw new AppError("format 只支持 md 或 txt", { code: "INVALID_FORMAT", status: 400 });
        const novel = store.exportNovel(gameId, format);
        if (novel === null) throw new AppError("找不到这段故事", { code: "GAME_NOT_FOUND", status: 404 });
        response.writeHead(200, {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="tgn-live-${gameId}.${format}"`,
          "Cache-Control": "no-store",
        });
        return response.end(novel);
      }

      const metricsMatch = url.pathname.match(/^\/api\/games\/([^/]+)\/metrics$/);
      if (request.method === "GET" && metricsMatch) {
        const metrics = store.getMetrics(decodeURIComponent(metricsMatch[1]));
        if (!metrics) throw new AppError("找不到这段故事", { code: "GAME_NOT_FOUND", status: 404 });
        return sendJson(response, 200, metrics);
      }

      if (request.method === "GET") return serveStatic(config.publicDir, url.pathname, response);
      throw new AppError("接口不存在", { code: "NOT_FOUND", status: 404 });
    } catch (error) {
      if (response.headersSent) {
        if (!response.writableEnded) response.end();
        return;
      }
      const safe = publicError(error);
      sendJson(response, error.status || 500, safe);
    }
  });

  async function handleTurn({ request, response, gameId, receivedMono, receivedAt }) {
    const body = await readJson(request);
    const action = validateAction(body.action, config.maxActionChars);
    const expectedVersion = validateVersion(body.expectedVersion);
    const requestId = validateRequestId(body.requestId);
    const language = normalizeLanguage(body.language, { optional: true });
    if (inFlight.has(gameId)) throw new AppError("这段故事已有行动正在生成", { code: "GAME_BUSY", status: 409, retryable: true });
    const trace = new TurnTrace({ gameId, requestId, startedMono: receivedMono, startedAt: receivedAt });
    trace.startStage("http_input_validation", { startMs: 0, startedAt: receivedAt });
    trace.endStage("http_input_validation");
    trace.startStage("request_validation");
    const reservation = store.reserveRequest({ gameId, requestId, expectedVersion, traceId: trace.id, action, language });
    trace.endStage("request_validation", "complete");

    startSse(response);
    if (reservation.kind === "complete") {
      const priorTrace = store.getTrace(reservation.traceId);
      writeSse(response, "complete", { game: reservation.game, turn: reservation.turn, metrics: publicMetrics(priorTrace), idempotentReplay: true });
      return response.end();
    }

    const controller = new AbortController();
    const heartbeat = setInterval(() => { if (!response.destroyed) response.write(': keepalive\n\n'); }, 15000);
    inFlight.set(gameId, { controller, requestId, traceId: trace.id });
    response.on("close", () => {
      if (!response.writableEnded) controller.abort(new Error("client disconnected"));
    });

    try {
      const game = reservation.game;
      const world = getWorldByGame(store, gameId);
      if (!world) throw new AppError("存档引用的世界不存在", { code: "WORLD_NOT_FOUND", status: 500 });
      const existingPlan = store.getLatestPlan(gameId);
      const generated = await generationService.execute({
        game,
        world,
        action,
        language: reservation.language,
        existingPlan,
        signal: controller.signal,
        trace,
        onStage: (stageInfo) => writeSse(response, "stage", stageInfo),
        onText: (delta) => writeSse(response, "text", { delta }),
      });

      controller.signal.throwIfAborted();
      trace.startStage("persistence");
      const provisionalTrace = trace.value;
      const committed = store.commitTurn({
        gameId,
        requestId,
        expectedVersion,
        action,
        language: reservation.language,
        reduced: generated.reduced,
        plan: generated.plan,
        chapterTurns: config.chapterTurns,
        trace: provisionalTrace,
      });
      trace.endStage("persistence", "complete");
      // Server completion boundary; browser paint/choice readiness is measured in the UI.
      trace.value.apiCompleteMs = trace.elapsed();
      trace.point("api_complete_dispatch");
      const finished = trace.finish("complete");
      store.insertTrace(finished, "complete");
      writeSse(response, "stage", { name: "persistence", status: "complete", elapsedMs: finished.stages.find((stage) => stage.name === "persistence")?.elapsedMs });
      writeSse(response, "complete", { game: committed.game, turn: committed.turn, metrics: publicMetrics(finished) });
      response.end();
    } catch (error) {
      const cancelled = controller.signal.aborted || error.code === "CANCELLED";
      const safe = publicError(error);
      trace.value.errors.push({ phase: "turn", code: safe.code, message: safe.message });
      const finished = trace.finish(cancelled ? "cancelled" : "failed");
      store.failRequest({ gameId, requestId, status: cancelled ? "cancelled" : "failed", error: safe, trace: finished });
      writeSse(response, "error", { ...safe, traceId: trace.id });
      response.end();
    } finally {
      clearInterval(heartbeat);
      if (inFlight.get(gameId)?.requestId === requestId) inFlight.delete(gameId);
    }
  }

  async function handleWorld({ request, response }) {
    const body = await readJson(request);
    const requestId = validateRequestId(body.requestId);
    const language = normalizeLanguage(body.language);
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 2000) throw new AppError('世界描述需为1—2000个字符', { code: 'INVALID_WORLD_PROMPT', status: 400 });
    const previous = store.getWorldRequest(requestId);
    if (previous) {
      if (previous.prompt !== prompt || previous.language !== language) throw new AppError('这个requestId已经用于另一份世界描述或语言', { code: 'IDEMPOTENCY_CONFLICT', status: 409 });
      startSse(response);
      writeSse(response, 'complete', { world: publicWorld(previous.world), metrics: previous.metrics, idempotentReplay: true });
      return response.end();
    }
    const activeWorld = worldInFlight.get(requestId);
    if (activeWorld) {
      if (activeWorld.prompt !== prompt || activeWorld.language !== language) throw new AppError('这个requestId已经用于另一份世界描述或语言', { code: 'IDEMPOTENCY_CONFLICT', status: 409 });
      throw new AppError('这个世界仍在生成', { code: 'REQUEST_IN_PROGRESS', status: 409, retryable: true });
    }
    if (!worldForge) throw new AppError('世界生成服务未配置', { code: 'WORLD_FORGE_UNAVAILABLE', status: 503 });
    const controller = new AbortController();
    const trace = new TurnTrace({ gameId: null, requestId });
    trace.value.kind = 'world-creation';
    worldInFlight.set(requestId, { controller, prompt, language });
    startSse(response);
    const heartbeat = setInterval(() => { if (!response.destroyed) response.write(': keepalive\n\n'); }, 15000);
    response.on('close', () => { if (!response.writableEnded) controller.abort(new Error('client disconnected')); });
    try {
      const world = await worldForge.generate({ prompt, language, signal: controller.signal, trace, onStage: info => writeSse(response, 'stage', info) });
      controller.signal.throwIfAborted();
      trace.startStage('world_persistence');
      writeSse(response, 'stage', { name: 'world_persistence', status: 'running', elapsedMs: trace.elapsed() });
      store.saveWorld({ world, prompt, requestId, language });
      trace.endStage('world_persistence', 'complete');
      const finished = trace.finish('complete');
      store.insertTrace(finished, 'complete');
      const metrics = publicMetrics(finished);
      store.saveWorldMetrics(world.id, metrics);
      writeSse(response, 'complete', { world: publicWorld(world), metrics });
      response.end();
    } catch (error) {
      const cancelled = controller.signal.aborted || error.code === 'CANCELLED';
      const safe = cancelled ? { message: '世界生成已停止，未完成世界没有保存', code: 'CANCELLED', retryable: true } : publicError(error);
      trace.value.errors.push({ phase: 'world', code: safe.code, message: safe.message });
      store.insertTrace(trace.finish(cancelled ? 'cancelled' : 'failed'));
      writeSse(response, 'error', { ...safe, traceId: trace.id });
      response.end();
    } finally {
      clearInterval(heartbeat);
      worldInFlight.delete(requestId);
    }
  }

  return { server, inFlight, worldInFlight };


}

function getWorldByGame(store, gameId) {
  return store.getGameWorld(gameId);
}

function validateName(value) {
  if (typeof value !== "string") throw new AppError("请输入主角姓名", { code: "INVALID_NAME", status: 400 });
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 24) throw new AppError("主角姓名需为 1–24 个字符", { code: "INVALID_NAME", status: 400 });
  return name;
}

function validateAction(value, maxLength) {
  if (typeof value !== "string") throw new AppError("行动必须是文本", { code: "INVALID_ACTION", status: 400 });
  const action = value.trim();
  if (action.includes("\uFFFD")) throw new AppError("行动文字编码损坏，请重新输入", {code:"INVALID_ENCODING",status:400});
  if (!action || action.length > maxLength) throw new AppError(`行动需为 1–${maxLength} 个字符`, { code: "INVALID_ACTION", status: 400 });
  return action;
}

function validateVersion(value) {
  if (!Number.isInteger(value) || value < 0) throw new AppError("expectedVersion 无效", { code: "INVALID_VERSION", status: 400 });
  return value;
}

function validateRequestId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{8,100}$/.test(value)) {
    throw new AppError("requestId 无效", { code: "INVALID_REQUEST_ID", status: 400 });
  }
  return value;
}

async function readJson(request) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > 64 * 1024) throw new AppError("请求体过大", { code: "BODY_TOO_LARGE", status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw new AppError("请求体不是有效 JSON", { code: "INVALID_JSON", status: 400 });
  }
}

function startSse(response) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  response.flushHeaders?.();
}

function writeSse(response, event, data) {
  if (!response.destroyed && !response.writableEnded) response.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sendJson(response, status, value) {
  response.writeHead(status, JSON_HEADERS);
  response.end(JSON.stringify(value));
}

function serveStatic(publicDir, pathname, response) {
  const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolved = path.resolve(publicDir, relative);
  const root = path.resolve(publicDir);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new AppError("路径无效", { code: "NOT_FOUND", status: 404 });
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) throw new AppError("页面不存在", { code: "NOT_FOUND", status: 404 });
  const extension = path.extname(resolved).toLowerCase();
  const contentTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml" };
  response.writeHead(200, { "Content-Type": contentTypes[extension] || "application/octet-stream", "Cache-Control": extension === ".html" ? "no-cache" : "public, max-age=300" });
  fs.createReadStream(resolved).pipe(response);
}

function publicMetrics(trace) {
  if (!trace) return null;
  return {
    traceId: trace.id,
    totalElapsedMs: trace.totalElapsedMs,
    firstFinalAnswerTokenMs: trace.firstFinalAnswerTokenMs,
    firstReaderVisibleMs: trace.firstReaderVisibleMs,
    firstNarrativeSseMs: trace.firstNarrativeSseMs ?? trace.firstReaderVisibleMs,
    apiCompleteMs: trace.apiCompleteMs,
    browserFirstNarrativePaintMs: null,
    browserChoicesVisibleMs: null,
    stages: trace.stages,
    provider: trace.provider,
    repairAttempts: trace.repairAttempts,
    changeKinds: (trace.appliedDeltas || []).map(({field, op}) => ({field, op})),
  };
}
