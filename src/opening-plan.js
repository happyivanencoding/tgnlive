// Reader-safe facts already present in the selected world snapshot. This is a
// release projection, not new lore, a prelude generator, or another model call.
export function openingOrientation(world, state) {
  const realms = world.powerSystem.realms;
  return {
    world: world.description,
    power: world.powerSystem.summary,
    growth: world.powerSystem.growth,
    current: realms.find(realm => realm.rank === state.realm.rank),
    next: realms.find(realm => realm.rank === state.realm.rank + 1) || null,
    soughtAfter: world.growthGrammar?.desire || world.opening.goal,
    advantage: state.power,
    place: state.location,
  };
}

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
