import { AppError } from './errors.js';

// Durable rights and reader-facing offers, not a second inventory or an XP engine.
export const LEVERAGE_KINDS = Object.freeze(['relationship', 'access', 'identity', 'enterprise', 'property']);
export function emptyProgression() { return { version: 1, leverage: [], opportunities: [] }; }
const clean = value => String(value).trim().replace(/\s+/g, ' ');
function invalid(message) { throw new AppError(message, { code: 'INVALID_PROGRESSION', status: 422, retryable: true }); }
function text(value, field, max = 320) {
  if (typeof value !== 'string' || !value.trim() || clean(value).length > max) invalid(`${field} 必须是1—${max}字文本`);
  return clean(value);
}
function list(value, field) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 3) invalid(`${field} 每回合最多3项`);
  return value.map((op, i) => {
    if (!op || typeof op !== 'object' || Array.isArray(op)) invalid(`${field}[${i}] 必须是对象`);
    return op;
  });
}
function witness(op, narrative) {
  // Optional legacy annotation only. Canon already retains this turn's full prose.
  // Exact quote matching caused needless full-model repairs in live candidate A;
  // it is not a truth check and must never force the writer to invent a reward.
  return typeof op.evidence === 'string' ? clean(op.evidence).slice(0, 240) : undefined;
}
function durableChange(applied) {
  return applied.some(c => c.field === 'realm' || c.field === 'capability'
    || (c.field === 'inventory' && ['add', 'update'].includes(c.op))
    || (c.field === 'coins' && c.delta > 0)
    || (c.field === 'leverage' && c.op !== 'revoke'));
}

export function applyProgression(state, delta, narrative, applied) {
  const leverageOps = list(delta.leverageOps, 'leverageOps');
  const opportunityOps = list(delta.opportunityOps, 'opportunityOps');
  if (!state.progression) state.progression = emptyProgression();
  const account = state.progression;
  const turn = state.turnNumber + 1;
  for (const op of leverageOps) {
    const id = text(op.id, 'leverage.id', 80);
    const evidence = witness(op, narrative);
    const asset = account.leverage.find(x => x.id === id);
    if (op.op === 'add') {
      if (asset) invalid(`leverage ${id} 已存在；改变用update，实际再次利用用use`);
      if (!LEVERAGE_KINDS.includes(op.kind)) invalid('leverage.kind 只能是 relationship/access/identity/enterprise/property');
      if (account.leverage.length >= 40) invalid('长期筹码记录已达40项，不能静默丢弃');
      const sourceId = op.sourceId === undefined ? undefined : text(op.sourceId, 'leverage.sourceId', 80);
      if (op.kind === 'relationship' && !state.relationships.some(n => n.id === sourceId)) invalid('relationship筹码必须关联已知NPC的sourceId，不能凭空获得帮助者');
      const next = { id, kind: op.kind, name: text(op.name, 'leverage.name', 80), effect: text(op.effect, 'leverage.effect', 400), scope: text(op.scope, 'leverage.scope', 240), ...(sourceId ? { sourceId } : {}), status: 'active', acquiredAtTurn: turn, lastUsedAtTurn: null, useCount: 0 };
      account.leverage.push(next);
      applied.push({ field: 'leverage', op: 'add', id, name: next.name, value: next.effect, evidence });
      continue;
    }
    if (!asset || asset.status !== 'active') invalid(`leverage ${id} 不存在或已失去，不能${op.op}`);
    if (op.op === 'update') {
      asset.effect = text(op.effect, 'leverage.effect', 400);
      asset.scope = text(op.scope, 'leverage.scope', 240);
      if (op.name !== undefined) asset.name = text(op.name, 'leverage.name', 80);
      asset.updatedAtTurn = turn;
      applied.push({ field: 'leverage', op: 'update', id, name: asset.name, value: asset.effect, evidence });
    } else if (op.op === 'use') {
      if (asset.lastUsedAtTurn === turn) invalid(`leverage ${id} 本回合已记录使用`);
      asset.lastUsedAtTurn = turn;
      asset.useCount += 1;
      applied.push({ field: 'leverage', op: 'use', id, name: asset.name, value: evidence });
    } else if (op.op === 'revoke') {
      asset.status = 'revoked';
      asset.endedAtTurn = turn;
      asset.endedBecause = evidence;
      applied.push({ field: 'leverage', op: 'revoke', id, name: asset.name, value: evidence });
    } else invalid(`不支持leverage操作 ${op.op}`);
  }
  for (const op of opportunityOps) {
    const id = text(op.id, 'opportunity.id', 80);
    const evidence = witness(op, narrative);
    const offer = account.opportunities.find(x => x.id === id);
    if (op.op === 'open') {
      if (offer) invalid(`opportunity ${id} 已存在，不得用同一id重开或改变兑现条件`);
      if (account.opportunities.filter(x => x.status === 'open').length >= 6) invalid('同时最多6项明确成长机会，先兑现/关闭旧机会而非不断新增');
      account.opportunities.push({ id, name: text(op.name, 'opportunity.name', 100), payoff: text(op.payoff, 'opportunity.payoff', 320), approach: text(op.approach, 'opportunity.approach', 320), status: 'open', offeredAtTurn: turn });
      applied.push({ field: 'opportunity', op: 'open', id, name: op.name, value: op.payoff, evidence });
    } else {
      if (!offer || offer.status !== 'open') invalid(`opportunity ${id} 不存在或已关闭`);
      if (!['fulfill', 'close'].includes(op.op)) invalid(`不支持opportunity操作 ${op.op}`);
      const materialized = op.op === 'fulfill' && durableChange(applied);
      // An answered investigation is allowed, but is not reported as a material
      // growth payoff. Do not buy format compliance with a gratuitous new skill.
      offer.status = op.op === 'fulfill' ? (materialized ? 'fulfilled' : 'answered') : 'closed';
      offer.materialized = materialized;
      offer.result = text(op.result, 'opportunity.result', 320);
      offer.settledAtTurn = turn;
      applied.push({ field: 'opportunity', op: op.op === 'fulfill' && !materialized ? 'answer' : op.op, id, name: offer.name, value: offer.result, evidence });
    }
  }
  // The full event history stays in canon_ledger/turns. Keep all live rights/offers
  // and the recent settlements in the hot state instead of unbounded prompt growth.
  const settled = account.opportunities.filter(x => x.status !== 'open');
  if (settled.length > 12) {
    const keep = new Set(settled.slice(-12).map(x => x.id));
    account.opportunities = account.opportunities.filter(x => x.status === 'open' || keep.has(x.id));
  }
}

export function growthHorizon(world, state, plan) {
  return {
    originalDesire: world.opening?.goal,
    uniqueAdvantage: state.power?.growth,
    worldGrammar: world.growthGrammar || null,
    currentStage: plan?.growth || null,
    // Deterministic projection of existing authority, not a second power database.
    powerIdentity: {
      current: world.powerSystem.realms.find(realm => realm.rank === state.realm.rank),
      next: world.powerSystem.realms.find(realm => realm.rank === state.realm.rank + 1) || null,
      preparation: state.realm.progress,
    },
  };
}

export function progressionContractText() {
  return `长期成长记录（只写本轮正文实际发生的变化，不按回合送奖）：
技能仍用capabilityOps，随身物仍用inventoryOps，态度仍用relationshipChanges。地图、普通路线、已掌握的操作边界记facts或capability，不逐段变成leverage。已获得的可复用人物帮助、组织准入、身份、独占渠道、产业或产权才用leverageOps；潜在邀请/友善本身不是权利。relationship要写这个人以后会实际帮什么，access要有谁授予什么资格；enterprise是自己可持续经营的资源来源，不是有人愿意收一件货。旧路线记录无需删除或迁移；实际取得更完整的同一渠道时更新旧项，不拆成许多小入口。
leverageOps至多3项：{op:"add",id,kind:"relationship|access|identity|enterprise|property",name,effect:"以后具体能做什么",scope:"地点/次数/互惠条件等边界",sourceId:"relationship须给已知NPC的id"}；实质改变{op:"update",id,effect,scope}；后来实际利用{op:"use",id}；确实失去{op:"revoke",id}。不会自动生钱、升级或让NPC无条件服务。
opportunityOps至多3项：向角色明确展示能争取的能力/财富/服务等收益才{op:"open",id,name,payoff,approach:"当前已知取得条件"}，不把每条待查线索当成长机会；同时至多6项。结果已发生后{op:"fulfill",id,result}，在对应状态字段记真实收获；知识性解答会记为answered而非物质成长，不得为了满足格式凭空增加奖励。放弃或机会消失{op:"close",id,result}。条件既已达成不要又新增一道验证；世界事件确实改变条件就关闭旧机会，不重开同id。promisesAdd/Resolve只记角色真正许下的诺言。`;
}
