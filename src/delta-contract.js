// Resource ceilings are deliberately more tolerant than narrative targets.
// Six valid new facts must not trigger a second model call or discard canon.
export const DELTA_LIMITS = Object.freeze({ factsPerTurn: 20, factChars: 160, inventoryOps: 5, relationshipChanges: 5, promisesPerTurn: 3, progressPerTurn: 20, coinsPerTurn: 500 });
export function deltaContractText() {
  return `状态提案契约（初稿与修复共用）：choices 恰好3个{id,label}；delta 必须是对象，没有变动的字段省略。factsAdd 是字符串数组，优先记录1—5条真正新发生的关键事实，硬上限${DELTA_LIMITS.factsPerTurn}条，每条最多${DELTA_LIMITS.factChars}字符；不要把NPC猜测写成已证实真相。inventoryOps 至多${DELTA_LIMITS.inventoryOps}条，op=add/remove，qty整数1—10，remove只可扣现有物品；relationshipChanges至多${DELTA_LIMITS.relationshipChanges}条，attitude只能是敌视/戒备/陌生/中立/好奇/友善/信任/亲近。promisesAdd/Resolve各至多${DELTA_LIMITS.promisesPerTurn}条，resolve须与已有承诺逐字相同。coinsDelta整数-${DELTA_LIMITS.coinsPerTurn}至${DELTA_LIMITS.coinsPerTurn}，余额不得负数。realmProgressDelta整数0—${DELTA_LIMITS.progressPerTurn}，只有真实修炼或已写清的能力掌握才可增加；realmAdvance必须先达到100进度且只能进入下一境界。changes可省略，最多8条，每条160字符，最终界面变化由程序根据已应用delta计算。location/goal最多160字符。错误须修改具体字段，不能只把整段正文改写一遍后重复错误。`;
}
