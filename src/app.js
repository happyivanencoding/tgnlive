import fs from "node:fs";
import path from "node:path";
import { createServer } from "node:http";
import { AppError, publicError } from "./errors.js";
import { createId } from "./ids.js";
import { TurnTrace } from "./telemetry.js";
import { createSeedState, getPower, getWorld, publicWorlds } from "./worlds.js";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };

export function createApp({ config, store, generationService }) {
  const inFlight = new Map();

  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || `${config.host}:${config.port}`}`);
      validateLocalRequest(request);
      if (request.method === "GET" && url.pathname === "/api/health") {
        const health = generationService.providerHealth();
        return sendJson(response, 200, {
          ok: true,
          version: config.version,
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
              mode: "read-only",
              acpPromptConcurrencyLimit: 2,
            },
            ...(health.warning ? { warning: health.warning } : {}),
          },
          limitations: ["local-only prototype", "read-only ACP mode is not a hostile multi-tenant sandbox guarantee", "AI illustrations are not implemented"],
        });
      }
      if (request.method === "GET" && url.pathname === "/api/worlds") {
        return sendJson(response, 200, { worlds: publicWorlds() });
      }
      if (request.method === "GET" && url.pathname === "/api/games") {
        return sendJson(response, 200, { games: store.listGames() });
      }
      if (request.method === "POST" && url.pathname === "/api/games") {
        const body = await readJson(request);
        const name = validateName(body.name);
        const world = getWorld(body.worldId);
        const power = getPower(world, body.powerId);
        if (!world || !power) throw new AppError("世界或异能不存在", { code: "INVALID_GAME_SELECTION", status: 400 });
        const game = store.createGame({
          name,
          title: `${name}的《${world.title}》`,
          worldId: world.id,
          powerId: power.id,
          state: createSeedState(world, power),
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
        return await handleTurn({ request, response, gameId: decodeURIComponent(turnsMatch[1]) });
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

  async function handleTurn({ request, response, gameId }) {
    const body = await readJson(request);
    const action = validateAction(body.action, config.maxActionChars);
    const expectedVersion = validateVersion(body.expectedVersion);
    const requestId = validateRequestId(body.requestId);
    if (inFlight.has(gameId)) throw new AppError("这段故事已有行动正在生成", { code: "GAME_BUSY", status: 409, retryable: true });
    const trace = new TurnTrace({ gameId, requestId });
    trace.startStage("request_validation");
    const reservation = store.reserveRequest({ gameId, requestId, expectedVersion, traceId: trace.id, action });
    trace.endStage("request_validation", "complete");

    startSse(response);
    if (reservation.kind === "complete") {
      const priorTrace = store.getTrace(reservation.traceId);
      writeSse(response, "complete", { game: reservation.game, turn: reservation.turn, metrics: publicMetrics(priorTrace), idempotentReplay: true });
      return response.end();
    }

    const controller = new AbortController();
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
        reduced: generated.reduced,
        plan: generated.plan,
        chapterTurns: config.chapterTurns,
        trace: provisionalTrace,
      });
      trace.endStage("persistence", "complete");
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
      if (inFlight.get(gameId)?.requestId === requestId) inFlight.delete(gameId);
    }
  }

  return { server, inFlight };

  function validateLocalRequest(request) {
    const host = request.headers.host || "";
    let hostUrl;
    try { hostUrl = new URL(`http://${host}`); } catch {
      throw new AppError("Host 无效", { code: "INVALID_HOST", status: 403 });
    }
    if (!new Set(["127.0.0.1", "localhost", "[::1]"]).has(hostUrl.hostname)) {
      throw new AppError("只接受本机 Host", { code: "INVALID_HOST", status: 403 });
    }
    if (request.method === "GET" || request.method === "HEAD") return;
    const origin = request.headers.origin;
    if (!origin) return;
    let originUrl;
    try { originUrl = new URL(origin); } catch {
      throw new AppError("Origin 无效", { code: "INVALID_ORIGIN", status: 403 });
    }
    if (!new Set(["127.0.0.1", "localhost", "[::1]"]).has(originUrl.hostname) || originUrl.host !== host) {
      throw new AppError("拒绝跨来源写入", { code: "CROSS_ORIGIN_MUTATION", status: 403 });
    }
  }
}

function getWorldByGame(store, gameId) {
  const row = store.getGameRow(gameId);
  return row ? getWorld(row.world_id) : null;
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
    stages: trace.stages,
    provider: trace.provider,
    repairAttempts: trace.repairAttempts,
  };
}
