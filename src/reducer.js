import { AppError } from "./errors.js";
import { REALMS } from "./worlds.js";
import { DELTA_LIMITS } from "./delta-contract.js";
import { canonicalAttitude, formatChange, normalizeLanguage, seedLabels } from "./i18n.js";
import { applyProgression } from './progression.js';

const ATTITUDES = new Set(["敌视", "戒备", "陌生", "中立", "好奇", "友善", "信任", "亲近"]);
const MAX_TEXT = 320;

function shortText(value, field, { required = false, max = MAX_TEXT } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new AppError(`${field} 缺失`, { code: "INVALID_DELTA", status: 422 });
    return undefined;
  }
  if (typeof value !== "string") {
    throw new AppError(`${field} 必须是文本`, { code: "INVALID_DELTA", status: 422 });
  }
  const normalized = value.trim().replace(/\s+/g, " ");
  if ((required && !normalized) || normalized.length > max) {
    throw new AppError(`${field} 长度无效`, { code: "INVALID_DELTA", status: 422 });
  }
  return normalized;
}

function boundedInteger(value, field, minimum, maximum, fallback = 0) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new AppError(`${field} 超出允许范围`, { code: "INVALID_DELTA", status: 422 });
  }
  return value;
}

function uniqueStrings(values, field, maximum = 5) {
  if (values === undefined) return [];
  if (!Array.isArray(values)) {
    throw new AppError(`${field} 必须是字符串数组，实际类型为 ${typeof values}`, { code: "INVALID_DELTA", status: 422 });
  }
  if (values.length > maximum) {
    throw new AppError(`${field} 最多 ${maximum} 条，实际 ${values.length} 条；请合并同义事实，勿丢失关键后果`, { code: "INVALID_DELTA", status: 422 });
  }
  return [...new Set(values.map((value, index) => shortText(value, `${field}[${index}]`, { required: true })))];
}

function clone(value) {
  return structuredClone(value);
}

function applyInventory(state, operations, applied, rejected) {
  if (operations === undefined) return;
  if (!Array.isArray(operations) || operations.length > 5) {
    throw new AppError("inventoryOps 格式无效", { code: "INVALID_DELTA", status: 422 });
  }
  for (const [index, operation] of operations.entries()) {
    if (!operation || typeof operation !== "object") {
      throw new AppError(`inventoryOps[${index}] 格式无效`, { code: "INVALID_DELTA", status: 422 });
    }
    const op = operation.op;
    const itemId = shortText(operation.id, `inventoryOps[${index}].id`, { max: 80 });
    const name = shortText(operation.name, `inventoryOps[${index}].name`, { max: 80 });
    const qty = boundedInteger(operation.qty, `inventoryOps[${index}].qty`, 1, 10, 1);
    const existingIndex = state.inventory.findIndex((item) => (itemId && item.id === itemId) || (name && item.name === name));
    if (op === "add") {
      if (!name) throw new AppError("新增物品必须有名称", { code: "INVALID_DELTA", status: 422 });
      if (existingIndex >= 0) {
        state.inventory[existingIndex].qty = (state.inventory[existingIndex].qty || 1) + qty;
      } else {
        if (state.inventory.length >= 30) {
          rejected.push({ field: "inventory", reason: "inventory_capacity" });
          continue;
        }
        state.inventory.push({
          id: itemId || `item-${state.turnNumber + 1}-${state.inventory.length + 1}`,
          name,
          description: shortText(operation.description, `inventoryOps[${index}].description`, { max: 360 }),
          qty,
        });
      }
      applied.push({ field: "inventory", op: "add", name, qty });
      continue;
    }
    if (op === "update") {
      if (existingIndex < 0) {
        rejected.push({ field: "inventory", op, id: itemId, name, reason: "missing_item" });
        continue;
      }
      const existing = state.inventory[existingIndex];
      const description = shortText(operation.description, `inventoryOps[${index}].description`, { required: true, max: 360 });
      existing.description = description;
      applied.push({ field: "inventory", op, name: existing.name, description });
      continue;
    }
    if (op === "remove") {
      if (existingIndex < 0) {
        rejected.push({ field: "inventory", op: "remove", id: itemId, name, reason: "missing_item" });
        continue;
      }
      const existing = state.inventory[existingIndex];
      const currentQty = existing.qty || 1;
      if (qty > currentQty) {
        rejected.push({ field: "inventory", op: "remove", name: existing.name, reason: "insufficient_quantity" });
        continue;
      }
      if (qty === currentQty) state.inventory.splice(existingIndex, 1);
      else existing.qty = currentQty - qty;
      applied.push({ field: "inventory", op: "remove", name: existing.name, qty });
      continue;
    }
    throw new AppError(`不支持的物品操作 ${op}`, { code: "INVALID_DELTA", status: 422 });
  }
}

function applyRelationships(state, changes, applied) {
  if (changes === undefined) return;
  if (!Array.isArray(changes) || changes.length > 5) {
    throw new AppError("relationshipChanges 格式无效", { code: "INVALID_DELTA", status: 422 });
  }
  for (const [index, change] of changes.entries()) {
    const known = change?.id ? state.relationships.find(item => item.id === change.id) : undefined;
    const name = shortText(change?.name || known?.name, `relationshipChanges[${index}].name`, { required: true, max: 60 });
    const attitude = shortText(canonicalAttitude(change.attitude), `relationshipChanges[${index}].attitude`, { required: true, max: 20 });
    if (!ATTITUDES.has(attitude)) {
      throw new AppError(`关系态度 ${attitude} 不受支持`, { code: "INVALID_DELTA", status: 422 });
    }
    const id = shortText(change.id, `relationshipChanges[${index}].id`, { max: 80 });
    let relationship = state.relationships.find((item) => (id && item.id === id) || item.name === name);
    if (!relationship) {
      if (state.relationships.length >= 30) continue;
      relationship = { id: id || `npc-${state.relationships.length + 1}`, name };
      state.relationships.push(relationship);
    }
    relationship.role = shortText(change.role, `relationshipChanges[${index}].role`, { max: 60 }) || relationship.role;
    relationship.attitude = attitude;
    applied.push({ field: "relationship", name, attitude });
  }
}

function applyCapabilities(state, operations, applied, rejected, language) {
  if (operations === undefined) return;
  if (!Array.isArray(operations) || operations.length > 3) {
    throw new AppError("capabilityOps 格式无效", { code: "INVALID_DELTA", status: 422 });
  }
  state.capabilities ||= [];
  for (const [index, operation] of operations.entries()) {
    if (!operation || typeof operation !== "object") {
      throw new AppError(`capabilityOps[${index}] 格式无效`, { code: "INVALID_DELTA", status: 422 });
    }
    const op = operation.op;
    const id = shortText(operation.id, `capabilityOps[${index}].id`, { required: true, max: 80 });
    const name = shortText(operation.name, `capabilityOps[${index}].name`, { required: true, max: 60 });
    const description = shortText(operation.description, `capabilityOps[${index}].description`, { required: true, max: 480 });
    const existing = state.capabilities.find((ability) => ability.id === id || ability.name === name);
    if (op === "add") {
      if (existing) {
        rejected.push({ field: "capabilities", op, id, reason: "capability_exists" });
        continue;
      }
      if (state.capabilities.length >= 30) {
        rejected.push({ field: "capabilities", op, id, reason: "capability_capacity" });
        continue;
      }
      state.capabilities.push({ id, name, description, source: shortText(operation.source, `capabilityOps[${index}].source`, { max: 160 }) || seedLabels(language).storyAcquired });
      applied.push({ field: "capability", op, name, description });
      continue;
    }
    if (op === "improve") {
      if (!existing) {
        rejected.push({ field: "capabilities", op, id, reason: "missing_capability" });
        continue;
      }
      existing.name = name;
      existing.description = description;
      existing.source = shortText(operation.source, `capabilityOps[${index}].source`, { max: 160 }) || existing.source;
      applied.push({ field: "capability", op, name, description });
      continue;
    }
    throw new AppError(`不支持的能力操作 ${op}`, { code: "INVALID_DELTA", status: 422 });
  }
}

function applyRealm(state, delta, world, applied, rejected, language) {
  const progressDelta = boundedInteger(delta.realmProgressDelta, "realmProgressDelta", 0, 20, 0);
  if (progressDelta) {
    state.realm.progress = Math.min(100, state.realm.progress + progressDelta);
    applied.push({ field: "realm.progress", delta: progressDelta, value: state.realm.progress });
  }
  if (!delta.realmAdvance) return;
  if (state.realm.progress < 100) {
    rejected.push({ field: "realm", reason: "insufficient_progress" });
    return;
  }
  const realms = world?.powerSystem?.realms || REALMS;
  const expected = realms.find((realm) => realm.rank === state.realm.rank + 1);
  if (!expected || delta.realmAdvance !== expected.name) {
    rejected.push({ field: "realm", reason: "invalid_next_realm", proposed: delta.realmAdvance });
    return;
  }
  state.realm = { ...expected, progress: 0 };
  applied.push({ field: "realm", value: expected.name });
  if (expected.unlock) {
    state.capabilities ||= [];
    const id = `realm-${expected.rank}`;
    if (!state.capabilities.some((ability) => ability.id === id)) {
      const labels = seedLabels(language);
      const name = labels.realmCapability(expected.name);
      state.capabilities.push({ id, name, description: expected.unlock, source: labels.realmBreakthrough });
      applied.push({ field: "capability", op: "add", name, description: expected.unlock });
    }
  }
}

export function validateNarratorProposal(proposal) {
  if (!proposal || typeof proposal !== "object" || Array.isArray(proposal)) {
    throw new AppError("叙事结构不是对象", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  if (typeof proposal.narrative !== "string") {
    throw new AppError("narrative 必须是文本", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  const narrative = proposal.narrative.trim();
  if (!narrative || narrative.length > 5000) {
    throw new AppError("narrative 长度无效", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  if (!Array.isArray(proposal.choices) || proposal.choices.length !== 3) {
    throw new AppError("必须提供三个行动选择", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  const choices = proposal.choices.map((choice, index) => ({
    id: shortText(choice?.id, `choices[${index}].id`, { required: true, max: 40 }),
    label: shortText(choice?.label, `choices[${index}].label`, { required: true, max: 160 }),
  }));
  if (new Set(choices.map((choice) => choice.id)).size !== 3) {
    throw new AppError("行动选择 id 必须互不相同", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  if (proposal.delta !== undefined && (!proposal.delta || typeof proposal.delta !== "object" || Array.isArray(proposal.delta))) {
    throw new AppError("delta 格式无效", { code: "INVALID_OUTPUT", status: 422, retryable: true });
  }
  return { narrative, choices, delta: proposal.delta || {}, changes: uniqueStrings(proposal.changes, "changes", 8) };
}

export function reduceState(currentState, rawProposal, world, language = "zh") {
  const code = normalizeLanguage(language);
  const proposal = validateNarratorProposal(rawProposal);
  const state = clone(currentState);
  const delta = proposal.delta;
  const applied = [];
  const rejected = [];

  const location = shortText(delta.location, "location", { max: 100 });
  if (location && location !== state.location) {
    state.location = location;
    applied.push({ field: "location", value: location });
  }

  const coinDelta = boundedInteger(delta.coinsDelta, "coinsDelta", -500, 500, 0);
  if (coinDelta) {
    if (state.coins + coinDelta < 0) {
      rejected.push({ field: "coins", reason: "insufficient_coins", proposedDelta: coinDelta });
    } else {
      state.coins += coinDelta;
      applied.push({ field: "coins", delta: coinDelta, value: state.coins, currencyName: state.currencyName || "铜钱" });
    }
  }

  applyInventory(state, delta.inventoryOps, applied, rejected);
  applyRelationships(state, delta.relationshipChanges, applied);
  applyCapabilities(state, delta.capabilityOps, applied, rejected, code);
  applyRealm(state, delta, world, applied, rejected, code);
  applyProgression(state, delta, proposal.narrative, applied);

  const goal = shortText(delta.goal, "goal", { max: 320 });
  if (goal && goal !== state.goal) {
    state.goal = goal;
    applied.push({ field: "goal", value: goal });
  }

  for (const fact of uniqueStrings(delta.factsAdd, "factsAdd", DELTA_LIMITS.factsPerTurn)) {
    if (!state.facts.includes(fact) && state.facts.length < 100) {
      state.facts.push(fact);
      applied.push({ field: "facts", op: "add", value: fact });
    }
  }
  for (const promise of uniqueStrings(delta.promisesAdd, "promisesAdd", 3)) {
    if (!state.promises.includes(promise) && state.promises.length < 30) {
      state.promises.push(promise);
      applied.push({ field: "promises", op: "add", value: promise });
    }
  }
  for (const promise of uniqueStrings(delta.promisesResolve, "promisesResolve", 3)) {
    const promiseIndex = state.promises.indexOf(promise);
    if (promiseIndex >= 0) {
      state.promises.splice(promiseIndex, 1);
      applied.push({ field: "promises", op: "resolve", value: promise });
    } else {
      rejected.push({ field: "promises", op: "resolve", value: promise, reason: "missing_promise" });
    }
  }

  state.turnNumber += 1;
  if (rejected.length) {
    throw new AppError("状态提案包含无法应用的变化", {
      code: "REJECTED_DELTA", status: 422, retryable: true, details: rejected,
    });
  }
  return {
    state,
    proposal,
    applied,
    rejected,
    changes: applied.map((change) => formatChange(change, code)),
  };
}
