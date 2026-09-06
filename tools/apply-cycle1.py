from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[1]
def change(file, old, new):
    p = ROOT / file
    text = p.read_text(encoding='utf-8-sig')
    if text.count(old) != 1:
        raise RuntimeError(f'{file}: expected exactly one target, found {text.count(old)}')
    p.write_text(text.replace(old, new), encoding='utf-8')

change('src/config.js', 'version: "0.1.0",', 'version: "0.2.0",\n    openingPlanStrategy: process.env.TGN_OPENING_PLAN || "authored",')
change('src/index.js', 'new GenerationService({ narrator, planner, plannerInterval: config.plannerInterval })', 'new GenerationService({ narrator, planner, plannerInterval: config.plannerInterval, openingPlanStrategy: config.openingPlanStrategy })')
change('src/app.js', 'version: config.version,', 'version: config.version,\n          architecture: { openingPlanStrategy: config.openingPlanStrategy, plannerInterval: config.plannerInterval, chapterTurns: config.chapterTurns },')
change('src/generation-service.js', 'import { reduceState } from "./reducer.js";', 'import { reduceState } from "./reducer.js";\nimport { authoredOpeningPlan } from "./opening-plan.js";')
change('src/generation-service.js', 'constructor({ narrator, planner, plannerInterval = 8 }) {', 'constructor({ narrator, planner, plannerInterval = 8, openingPlanStrategy = "authored" }) {\n    if (!["authored", "live"].includes(openingPlanStrategy)) throw new Error("openingPlanStrategy must be authored or live");\n    this.openingPlanStrategy = openingPlanStrategy;')
change('src/generation-service.js', 'return game.state.turnNumber === 0\n      || game.state.turnNumber % this.plannerInterval === 0', 'return game.state.turnNumber === 0 ? this.openingPlanStrategy === "live"\n      : game.state.turnNumber % this.plannerInterval === 0')
change('src/generation-service.js', '    if (this.shouldPlan(game)) {', '    trace.value.openingPlanStrategy = this.openingPlanStrategy;\n    if (game.state.turnNumber === 0 && this.openingPlanStrategy === "authored") {\n      await stage(trace, onStage, "authored_opening_plan", async () => {\n        freshPlan = authoredOpeningPlan(world);\n        plan = freshPlan;\n        trace.value.planSource = "authored-world-seed-no-model-call";\n      });\n    }\n    if (this.shouldPlan(game)) {\n      trace.value.planSource = "live-story-brain";')
change('src/generation-service.js', '    let reduced;\n    try {', '    // Final visible model output only, never private reasoning. Retain failures for diagnosis.\n    trace.value.candidateOutputs = [{ role: "narrator", finalText: rawOutput }];\n    let reduced;\n    try {')
change('src/generation-service.js', '        reduced = reduceState(game.state, repairedParser.finish());', '        trace.value.candidateOutputs.push({ role: "repair", finalText: repairedOutput });\n        reduced = reduceState(game.state, repairedParser.finish());')
change('src/reducer.js', 'import { REALMS } from "./worlds.js";', 'import { REALMS } from "./worlds.js";\nimport { DELTA_LIMITS } from "./delta-contract.js";')
change('src/reducer.js', '  if (!Array.isArray(values) || values.length > maximum) {\n    throw new AppError(`${field} 格式无效`, { code: "INVALID_DELTA", status: 422 });\n  }', '  if (!Array.isArray(values)) {\n    throw new AppError(`${field} 必须是字符串数组，实际类型为 ${typeof values}`, { code: "INVALID_DELTA", status: 422 });\n  }\n  if (values.length > maximum) {\n    throw new AppError(`${field} 最多 ${maximum} 条，实际 ${values.length} 条；请合并同义事实，勿丢失关键后果`, { code: "INVALID_DELTA", status: 422 });\n  }')
# Locate the actual invocation rather than guessing formatting.
p = ROOT/'src/reducer.js'; text=p.read_text(encoding='utf-8')
old='uniqueStrings(delta.factsAdd, "factsAdd")'
if old not in text:
    old='uniqueStrings(delta.factsAdd, "factsAdd", 5)'
if old not in text: raise RuntimeError('factsAdd call not found')
p.write_text(text.replace(old, 'uniqueStrings(delta.factsAdd, "factsAdd", DELTA_LIMITS.factsPerTurn)'),encoding='utf-8')
change('src/prompts.js', 'import { DELIMITER } from "./output-parser.js";', 'import { DELIMITER } from "./output-parser.js";\nimport { deltaContractText } from "./delta-contract.js";')
change('src/prompts.js', 'export function buildNarratorPrompt({ game, world, action, plan }) {\n  return `', 'export function buildNarratorPrompt({ game, world, action, plan }) {\n  return `${deltaContractText()}\\n\\n')
change('src/prompts.js', 'export function buildRepairPrompt({ game, action, invalidOutput, reason }) {\n  return `', 'export function buildRepairPrompt({ game, action, invalidOutput, reason }) {\n  return `${deltaContractText()}\\n\\n')
package = ROOT/'package.json'; obj=json.loads(package.read_text(encoding='utf-8')); obj['version']='0.2.0'; package.write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('Cycle 1 applied. Run unit/regression tests before restart and replay.')
