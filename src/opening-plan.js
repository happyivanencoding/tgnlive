export function authoredOpeningPlan(world) {
  return {
    pressure: world.opening.situation,
    npcMoves: structuredClone(world.opening.npcMoves),
    openings: [...world.opening.opportunities],
    continuity: [...world.opening.continuity],
    milestone: world.opening.milestone,
  };
}
