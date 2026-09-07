export function authoredOpeningPlan(world, state) {
  return {
    pressure: world.opening.situation,
    npcMoves: structuredClone(world.opening.npcMoves),
    openings: [...world.opening.opportunities],
    continuity: [...world.opening.continuity],
    milestone: world.opening.milestone,
    growth: {
      want: world.opening.goal,
      payoff: world.opening.milestone,
      afterUse: world.growthGrammar?.expansion || state?.power?.growth || world.powerSystem.growth,
    },
  };
}
