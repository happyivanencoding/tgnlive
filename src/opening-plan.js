export function authoredOpeningPlan(world) {
  // Authored setup is not a model generation and does not commit any future event.
  return {
    pressure: world.opening.situation,
    npcMoves: [
      { name: "沈秋禾", desire: "保住少年与药铺", nextMove: "设法遮掩伤者，但不会替玩家决定是否帮忙" },
      { name: "韩峥", desire: "找到赤砂令", nextMove: "搜查药市，同时留意河堤局势" },
      { name: "受伤少年", desire: "不再被带回旧矿", nextMove: "藏好铜片，寻找愿意交易或帮助的人" },
    ],
    openings: ["可与药铺交易引气药，也可介入藏人与搜查", "可借河沿灵潮感气，需自己选择安全时机", "可离城前往有吐纳石刻的废庙，也可完全改换路线"],
    continuity: ["开局地点为南门药市", "玩家没有自动接受任何任务", "可拒绝NPC请求；自由行动以现有能力和物品为界"],
    milestone: "玩家确实改变自己的处境后再根据已发生事件调整局势，不能提前承诺结局",
  };
}
