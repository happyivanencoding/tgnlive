## 恢复核验与最终收口（2026-09-07）

原任务`tsk_640e2aa00d255025`未重开；实际10条20回合、200唯一提交全部读取，恢复链不重复计数。最终接受/否决见`docs/V090_RESULTS.md`和`artifacts/reports/ascension-v090/DECISIONS.md`；耗时/失败/部署分别以LATENCY、FAILURE_REGISTER、DEPLOYMENT为准。未新开F、未重跑已定论长测。下方是原迭代中途记录，不是当前未完成状态。

前台丢上下文时先读persistent task、Git、原文件与artifacts，不能以工具发现失败倒推出“没有开发”。当前释放的是阶段成长与清晰度改进，不是长期留存完成。

# Ascension / Player Orientation iteration — 2026-09-07

Status: active experiment, NOT a released version or a long-form PASS. Production remains v0.8.0. Task: `tsk_640e2aa00d255025`.

## Baseline and custody

Actual HEAD, fetched origin/main and worktree were verified before editing: main at `26fc8e1d241aebf8ee798c6f186d5a079cd2afe0`, initially clean. Frozen tracked source: `.runtime/ascension-v090/baseline-source`; original archive: `baseline-26fc8e1.zip`. Baseline server uses port 4318 and its own SQLite under `.runtime/progression-v080/ascension-baseline-v080/`. Production 4317, existing world snapshots and private saves have not been rewritten. No second product, corpus import or old-TGN pipeline adoption.

Main quality trajectories must contain at least 20 unique successfully committed turns. Resume the same game/Canon after failure; inherited turns count once. Preserve original failures, Player failures, setup failures and completion failures separately. Every accepted candidate needs full prose/actions/choices/state/explicit Player-intent reading, not only ledger counts. A 0–10 turn probe is never long-form progression evidence.

## Earliest observed failure layers

1. Reader-facing fact release: world definitions contain public power rules and aspirations, but the opening starts with several NPCs and a decision scene before giving the player a reusable world model. A Player that receives full world/state data is not sufficient evidence of prose-only orientation.
2. Stage authority: the reducer imposed progress >=100 before any adjacent realm proposal. That mechanically rejects Canon attainment below the XP gate. However, a short special-power exception is not full next-stage mastery, and a social title is not bodily advancement.
3. World/growth objective: masked-tides Fault Taster explicitly ends in selling verification services. Repeated safe service transactions are an upstream fantasy-vector result, not merely timid narration.
4. Planning/granularity: opportunities repeatedly convert a settled task into another check; ordinary route knowledge occupies durable leverage and full scene time. The difference between a new capability boundary and a repeated proof is not strong enough in planning.
5. State contract: masked-tides turn 8 describes one remaining bitterleaf-root bundle but authoritative qty remains 2. `update` ignored quantity, including when supplied. By turn 18, two bundles can be traded. Partial contents of one packet remain a valid description-only update; that is not the same case as consuming one of two units.
6. Waiting: Brain checkpoint is synchronous before Narrator. Setup and completion faults also exist independently; first narrative text is not proof of a committed turn.

## Candidate A — narrow intervention, not accepted yet

- Project existing public world/current stage/next stage/unique advantage into a first-turn fact-release block, with a short direct orientation paragraph before the event.
- Explicit outcomes, public motives and scene reanchoring are allowed after meaningful situation changes. Suggested choices show what each route principally pursues, not just its verb.
- Project current/next physical benchmarks from the existing world snapshot into the growth context. Remove the unrelated XP100 veto on explicit adjacent attainment; preserve exact snapshot names, adjacent-only advance, no automatic breakthrough from time or filled progress. Stable core ability, control and required resources must actually be established in Canon.
- Record the attained physical benchmark as the stage capability, not automatic organizational rights from the world unlock description.
- Fix counted `inventoryOps.update.qty` as remaining total; omitted qty preserves the container/packet count; update cannot manufacture additional units. No extra inventory or weight system.
- No new reward quotas, per-turn judge/rewrite, task system, identity tree, mobile restructuring or lower model effort.

Mechanical validation: the real counted-consumption shape fails in baseline (2 failed assertions, 1 passed), passes after repair along with the old partial-packet tests (6/6). Candidate A full existing/new test suite: 104 passed, 0 failed. These results verify code contracts, not progression quality or correct semantic attainment by the model.

Candidate source snapshots must be made with `node eval/freeze-progression-source.mjs <label>` and their sourceHash recorded in the playtest manifest. HEAD alone is not the identity of an uncommitted candidate.

## Real-run register and recovery

- `ascension-baseline-hunt-20-v080`: 15 committed turns before turn 16 completion timeout and subsequent setup timeout; original game `game_ffd8fe8331494f65a16bab675b96a916`.
- `ascension-baseline-hunt-20-v080-r1`: same Canon, still 15, two additional setup failures. `-r2` continues that same game, not a new baseline.
- `ascension-baseline-martial-20-v080`: 14 committed turns before independent Player session creation failed; original game `game_88102b94b38f41cd9c087be3b3a292b6`.
- `ascension-baseline-martial-20-v080-r1`: same Canon, still 14, Player setup failure again. `-r2` continues the same game.

The complete final counts must be read from the finished r2 (or later explicit continuation), not inferred from the requested target. Initial harness manifests incorrectly carry the previous task's hard-coded ID; this iteration is owned by the task named above. Future manifests use TGN_EVAL_TASK_ID and explicit source path/hash; the decision prompt is unchanged.

## Infrastructure hypothesis rejected as an established cause

New ACP sessions began timing out at the 20-second caller boundary after previously successful play. Some sessions completed late, outside the caller, with no prompt; owned empty late sessions were identified by exact workspace and creation time and closed by exact ID. No global process kill or unrelated-session cleanup.

Process inspection found many OmniRoute and computer-use MCP child processes under the shared Codex parent. A project-local no-tools probe disabled only unused MCP/plugins in its own empty workspace, without changing models, authentication or sandbox permissions. First wrapper measurement was 6445ms. A subsequent same-client control also recovered: original configuration new=795ms, close=15ms; no-tools new=731/632ms, close=16/7ms. Therefore the probe does NOT establish that plugins caused the incident. Do not report it as a performance fix. No global config or production workspace config was changed; baselines resume under their original configuration. Evidence stays under `.runtime/ascension-v090/setup-probe-results.json`.

Installed bridge was inspected read-only: @agentclientprotocol/codex-acp 1.6.2 creates a Codex thread per new session and closes by thread unsubscribe. Process counts alone are not a count of live logical agents or proof that a specific task leaked them.

## Focused read-only learning receipts

Read the current handoffs, SYSTEM/ARCHITECTURE/WORLD_SYSTEM/MVP_SPEC/V080_RESULTS/PROGRESSION_ITERATION, generation/state/ACP/store implementation, and the full v0.8 beast16, masked18 and stars18 treatment readings with their actual actions and explicit Player intents. New baseline hunt1–15 and martial1–14 were read in full, including choices; count/root discrepancy verified against raw before/after state, not just prose.

Corpus `reference-corpus`: action-space-expansion, status-recognition, old-ability-new-use, map-transition-without-reset, resource-liberation and pure-upside-payoff mechanisms; status-and-recognition map; Global High Martial and Lord of Mysteries book-dna pilot cards; threshold-to-social-engine, sea-operating-model and craft-to-second-floor arcs; old-loop-fatigue and enemy-to-credit observations; first-breakthrough/resource-release contrasts. Pilot and stale tags remain limitations, not proof of production validity. No original full novel text was copied into the project.

Old TGN docs: targeted Public World Knowledge / Reader Orientation / Scene Ecology / Stable Geography / Action Advance != Situation Memory / Power Identity / Public Milestone / Proof Decay / Supporting Logic Compression. Transfer the judgment: earned implementation becomes cheap, new consequences stay foreground; the public ruler remains clear even when routine proof decays. Do not transfer that system's pipeline.

## Subsequent decisions required, not predeclared results

Run A on hunt and beast for at least20 committed turns; read whether public orientation improves, whether freely chosen first-mark desire still becomes engineering investigation, and whether stable reciprocal flight advances physical identity without automatic social entitlements. If orientation improves but task granularity does not, retain the former and target planning/mastery next. Masked's profession ceiling requires a separate upstream vector change and its own20+ verification. Martial needs an actually completed20+ trajectory, not the former zero-turn result. Cross-world evidence is required before claiming a general solution.

No public retention, physical-phone latency, billed token cost or long-form success may be inferred from a unit test or API receipt. Success and failure latency, Player deliberation, server SSE and browser visible frames must remain separate.
