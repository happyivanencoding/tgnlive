import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AppError } from "./errors.js";
import { createId } from "./ids.js";

function parseJson(value, fallback) {
  if (!value) return fallback;
  return JSON.parse(value);
}

function nowIso() {
  return new Date().toISOString();
}

export class GameStore {
  constructor(databasePath) {
    this.databasePath = databasePath;
    if (databasePath !== ":memory:") fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    this.db = new DatabaseSync(databasePath);
    this.db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
    this.migrate();
  }

  migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        world_id TEXT NOT NULL,
        power_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        state_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS turns (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        turn_index INTEGER NOT NULL,
        action TEXT NOT NULL,
        narrative TEXT NOT NULL,
        choices_json TEXT NOT NULL,
        changes_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        chapter_index INTEGER NOT NULL,
        trace_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        UNIQUE(game_id, turn_index),
        UNIQUE(game_id, request_id)
      );
      CREATE TABLE IF NOT EXISTS requests (
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        request_id TEXT NOT NULL,
        status TEXT NOT NULL,
        expected_version INTEGER NOT NULL,
        action TEXT NOT NULL,
        trace_id TEXT NOT NULL,
        turn_id TEXT,
        error_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY(game_id, request_id)
      );
      CREATE TABLE IF NOT EXISTS canon_ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        turn_index INTEGER NOT NULL,
        kind TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS story_plans (
        id TEXT PRIMARY KEY,
        game_id TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
        created_for_turn INTEGER NOT NULL,
        plan_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        game_id TEXT,
        request_id TEXT,
        status TEXT NOT NULL,
        trace_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_turns_game ON turns(game_id, turn_index);
      CREATE INDEX IF NOT EXISTS idx_traces_game ON traces(game_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_plans_game ON story_plans(game_id, created_for_turn);
    `);
    const requestColumns = this.db.prepare("PRAGMA table_info(requests)").all().map((column) => column.name);
    if (!requestColumns.includes("action")) this.db.exec("ALTER TABLE requests ADD COLUMN action TEXT NOT NULL DEFAULT ''");
  }

  close() {
    this.db.close();
  }

  transaction(callback) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = callback();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  createGame({ name, title, worldId, powerId, state }) {
    const id = createId("game");
    const createdAt = nowIso();
    this.db.prepare(`
      INSERT INTO games (id, name, title, world_id, power_id, version, state_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).run(id, name, title, worldId, powerId, JSON.stringify(state), createdAt, createdAt);
    return this.getGame(id);
  }

  listGames() {
    return this.db.prepare(`
      SELECT id, name, title, updated_at, state_json FROM games ORDER BY updated_at DESC
    `).all().map((row) => {
      const state = parseJson(row.state_json, {});
      return {
        id: row.id,
        name: row.name,
        title: row.title,
        updatedAt: row.updated_at,
        turnNumber: state.turnNumber || 0,
        realm: state.realm,
      };
    });
  }

  getGameRow(gameId) {
    return this.db.prepare("SELECT * FROM games WHERE id = ?").get(gameId);
  }

  getGame(gameId) {
    const row = this.getGameRow(gameId);
    if (!row) return null;
    const turns = this.getTurns(gameId);
    return {
      id: row.id,
      name: row.name,
      title: row.title,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      state: parseJson(row.state_json, {}),
      turns,
      chapters: groupChapters(turns),
    };
  }

  getTurns(gameId) {
    return this.db.prepare("SELECT * FROM turns WHERE game_id = ? ORDER BY turn_index").all(gameId).map(mapTurn);
  }

  reserveRequest({ gameId, requestId, expectedVersion, traceId, action }) {
    return this.transaction(() => {
      const game = this.getGameRow(gameId);
      if (!game) throw new AppError("找不到这段故事", { code: "GAME_NOT_FOUND", status: 404 });
      const existing = this.db.prepare("SELECT * FROM requests WHERE game_id = ? AND request_id = ?").get(gameId, requestId);
      if (existing) {
        if (existing.expected_version !== expectedVersion || existing.action !== action) {
          throw new AppError("这个 requestId 已绑定到不同的行动或版本", { code: "IDEMPOTENCY_CONFLICT", status: 409, retryable: false });
        }
        if (existing.status === "complete" && existing.turn_id) {
          const turn = this.db.prepare("SELECT * FROM turns WHERE id = ?").get(existing.turn_id);
          return { kind: "complete", game: this.getGame(gameId), turn: mapTurn(turn), traceId: existing.trace_id };
        }
        throw new AppError(
          existing.status === "running" ? "同一请求仍在处理中" : "这个 requestId 已用于一次终止的请求，请换一个 requestId 重试",
          { code: existing.status === "running" ? "REQUEST_IN_PROGRESS" : "REQUEST_ID_REUSED", status: 409, retryable: existing.status !== "running" },
        );
      }
      if (game.version !== expectedVersion) {
        throw new AppError("故事版本已变化，请刷新后重试", { code: "VERSION_CONFLICT", status: 409, retryable: true });
      }
      const createdAt = nowIso();
      this.db.prepare(`
        INSERT INTO requests (game_id, request_id, status, expected_version, action, trace_id, created_at, updated_at)
        VALUES (?, ?, 'running', ?, ?, ?, ?, ?)
      `).run(gameId, requestId, expectedVersion, action, traceId, createdAt, createdAt);
      return { kind: "reserved", game: this.getGame(gameId) };
    });
  }

  commitTurn({ gameId, requestId, expectedVersion, action, reduced, trace, plan, chapterTurns }) {
    return this.transaction(() => {
      const gameRow = this.getGameRow(gameId);
      const request = this.db.prepare("SELECT * FROM requests WHERE game_id = ? AND request_id = ?").get(gameId, requestId);
      if (!gameRow || !request || request.status !== "running") {
        throw new AppError("请求状态不允许提交", { code: "COMMIT_CONFLICT", status: 409, retryable: true });
      }
      if (gameRow.version !== expectedVersion) {
        throw new AppError("故事版本在生成期间发生变化", { code: "VERSION_CONFLICT", status: 409, retryable: true });
      }
      const turnIndex = reduced.state.turnNumber;
      const turnId = createId("turn");
      const createdAt = nowIso();
      const chapterIndex = Math.floor((turnIndex - 1) / chapterTurns) + 1;
      this.db.prepare(`
        INSERT INTO turns (id, game_id, turn_index, action, narrative, choices_json, changes_json, created_at, chapter_index, trace_id, request_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        turnId, gameId, turnIndex, action, reduced.proposal.narrative,
        JSON.stringify(reduced.proposal.choices), JSON.stringify(reduced.changes), createdAt,
        chapterIndex, trace.id, requestId,
      );
      this.db.prepare("UPDATE games SET version = version + 1, state_json = ?, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(reduced.state), createdAt, gameId);
      this.db.prepare(`
        INSERT INTO canon_ledger (game_id, turn_index, kind, payload_json, created_at) VALUES (?, ?, 'turn_delta', ?, ?)
      `).run(gameId, turnIndex, JSON.stringify({ applied: reduced.applied, rejected: reduced.rejected }), createdAt);
      if (plan) {
        this.db.prepare(`
          INSERT INTO story_plans (id, game_id, created_for_turn, plan_json, created_at) VALUES (?, ?, ?, ?, ?)
        `).run(createId("plan"), gameId, turnIndex, JSON.stringify(plan), createdAt);
      }
      this.db.prepare("UPDATE requests SET status = 'complete', turn_id = ?, updated_at = ? WHERE game_id = ? AND request_id = ?")
        .run(turnId, createdAt, gameId, requestId);
      this.insertTrace(trace, "complete");
      const turn = mapTurn(this.db.prepare("SELECT * FROM turns WHERE id = ?").get(turnId));
      return { game: this.getGame(gameId), turn };
    });
  }

  failRequest({ gameId, requestId, status, error, trace }) {
    this.transaction(() => {
      const updatedAt = nowIso();
      this.db.prepare(`
        UPDATE requests SET status = ?, error_json = ?, updated_at = ?
        WHERE game_id = ? AND request_id = ? AND status = 'running'
      `).run(status, JSON.stringify(error), updatedAt, gameId, requestId);
      this.insertTrace(trace, status);
    });
  }

  insertTrace(trace, status = trace.status) {
    this.db.prepare(`
      INSERT OR REPLACE INTO traces (id, game_id, request_id, status, trace_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(trace.id, trace.gameId || null, trace.requestId || null, status, JSON.stringify(trace), trace.startedAt || nowIso());
  }

  getLatestPlan(gameId) {
    const row = this.db.prepare("SELECT plan_json, created_for_turn FROM story_plans WHERE game_id = ? ORDER BY created_for_turn DESC LIMIT 1").get(gameId);
    return row ? { ...parseJson(row.plan_json, {}), createdForTurn: row.created_for_turn } : null;
  }

  getTrace(traceId) {
    const row = this.db.prepare("SELECT trace_json FROM traces WHERE id = ?").get(traceId);
    return row ? parseJson(row.trace_json, null) : null;
  }

  getMetrics(gameId) {
    if (!this.getGameRow(gameId)) return null;
    const rows = this.db.prepare("SELECT trace_json FROM traces WHERE game_id = ? ORDER BY created_at").all(gameId);
    const turns = rows.map((row) => parseJson(row.trace_json, {}));
    const completed = turns.filter((trace) => trace.status === "complete");
    const totals = completed.map((trace) => trace.totalElapsedMs).filter(Number.isFinite);
    const firstVisible = completed.map((trace) => trace.firstReaderVisibleMs).filter(Number.isFinite);
    return {
      turns,
      summary: {
        requests: turns.length,
        completed: completed.length,
        failed: turns.filter((trace) => trace.status === "failed").length,
        cancelled: turns.filter((trace) => trace.status === "cancelled").length,
        averageTotalMs: average(totals),
        averageFirstVisibleMs: average(firstVisible),
        usageTokens: null,
        cost: null,
      },
    };
  }

  exportNovel(gameId, format = "md") {
    const game = this.getGame(gameId);
    if (!game) return null;
    const lines = [];
    if (format === "md") {
      lines.push(`# ${game.title}`, "", `主角：${game.name}`, `异能：${game.state.power.name}`, "");
      for (const chapter of game.chapters) {
        lines.push(`## 第${chapter.index}章 ${chapter.title}`, "");
        for (const turn of chapter.turns) lines.push(turn.narrative, "");
      }
    } else {
      lines.push(game.title, `主角：${game.name}`, `异能：${game.state.power.name}`, "");
      for (const chapter of game.chapters) {
        lines.push(`第${chapter.index}章 ${chapter.title}`, "");
        for (const turn of chapter.turns) lines.push(turn.narrative, "");
      }
    }
    return lines.join("\n").trimEnd() + "\n";
  }
}

function mapTurn(row) {
  if (!row) return null;
  return {
    id: row.id,
    index: row.turn_index,
    action: row.action,
    narrative: row.narrative,
    choices: parseJson(row.choices_json, []),
    changes: parseJson(row.changes_json, []),
    createdAt: row.created_at,
    chapterIndex: row.chapter_index,
    traceId: row.trace_id,
  };
}

function groupChapters(turns) {
  const groups = new Map();
  for (const turn of turns) {
    if (!groups.has(turn.chapterIndex)) groups.set(turn.chapterIndex, []);
    groups.get(turn.chapterIndex).push(turn);
  }
  return [...groups.entries()].map(([index, chapterTurns]) => ({
    index,
    title: chapterTurns[0]?.index === 1 ? "烬河倒流" : `第${chapterTurns[0]?.index}回起`,
    turns: chapterTurns,
  }));
}

function average(values) {
  if (!values.length) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
