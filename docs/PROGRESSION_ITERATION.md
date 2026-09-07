# Growth-account iteration — 2026-09-07

## v0.9.0 当前生产契约（2026-09-07）

本节覆盖下方历史版本说明；实际部署状态与代码提交以 `artifacts/reports/ascension-v090/DEPLOYMENT.json` 回执为准。仍是原来的 TGN Live / 4317 / owner-only Access，同一书架、同一Canon，没有第二产品。详见 `docs/V090_RESULTS.md` 与 `docs/ASCENSION_ITERATION.md`。

首次入场直接释放现有World的世界规则、当前/下一力量阶段、行动空间、稀缺目标与天赋优势；局势明显改变后可直接重述人物位置、公开利益、结果与可走路径。三个建议说明争取什么，不要求每条都奖励。有限POV可整理公开信息，不能泄漏隐秘事实。

阶段身份服从Canon中稳定的核心能力与必要资源，不受XP100阻挡；仍限世界快照中的精确相邻阶段，时间、满进度和一次特殊借力不能自动突破。身体能力记录benchmark，不自动授予组织权利。旧存档与worldSnapshot不迁移。`update.qty` 为剩余件数，省略qty保留部分使用的包/瓶；update不得增加件数。提案为回合结束净状态，询价不等于授权付款，已售货物不留库存。

Story Brain沿用Sol/medium，计划只增加可选graduated/transition，记录已掌握普通环节与真正的阶段条件。成熟操作可在玩家授权范围内整段结算；不追加同义核验前置。leverage用于真实可反复调用的人、身份、组织资格、独占渠道/产业，普通路线用facts/capabilities，不批量改旧记录。

默认 `TGN_PLANNER_STRATEGY=prefetch`：已提交第6/14回合后基于当时Canon准备第8/16版本计划，下一次点击不等规划；就绪且游戏/语言/阶段/目标版本一致才用，未就绪/失败/过期/冷启动直接继续当前Canon与可用旧计划。当前行动优先，未发生的提前计划不是Canon。取消、过期、换游戏/阶段和退出会回收本任务；后台计划不写角色状态。`checkpoint` 环境开关保留为对照/回退。没有每回合judge、二次rewrite或更低effort。

主要质量实验必须20+唯一成功提交回合，同Canon恢复且失败原样保留；读全文/动作/建议/状态/显式Player意图。浏览器帧计时与服务端SSE分开，后台规划成本、Player思考、失败长尾单列。原移动布局/12–24px/滚动锁/preview同构/Stop/IME/RTL不改；本版仅更新静态缓存版本。

---

## 以下为历史设计与实验记录


Status: v0.8.0 deployed and verified on 2026-09-07. See V080_RESULTS.md and artifacts/reports/progression-v080/DEPLOYMENT.json for acceptance, measured limits and the production receipt. Offline tests and a larger prompt are not evidence of human retention; growth quality and overall latency remain qualified below.

## Baseline authority and protocol

Baseline source: main `58e738d`, copied with `git archive` before edits into `.runtime/progression-v080/baseline-source`. Its isolated server is 4318, database `.runtime/progression-v080/baseline-v070/games.sqlite`. Only the existing authored `陨港星图` world definition was copied read-only from the production world catalogue; no private player save was copied or modified.

`artifacts/eval/progression-baseline-stars-18-v070/` contains 18 completed autonomous ACP turns, 17 independent player decisions, all prose/choices/before-and-after states, player session IDs, server phase traces and exports. No failed application attempt and no repair occurred. Player model was Luna/low, narrator Terra/low, checkpoint Story Brain Sol/medium. The neutral player is not told a route, target reward, remaining number of turns, implementation, or hidden plan. Fresh player sessions see public world data, current public state, four recent turns, and their own last short intent. This is a repeatable limited-memory agent proxy, not a human cohort or a retention result.

The original baseline driver's even-sample `medianMs` is the lower central observation, not the conventional mean of the two central observations. Preserve that original summary as historical evidence. The comparison report recomputes all samples from raw `turns.jsonl` using the same conventional median and nearest-rank p95; new drivers use that convention. With n=18, p95 is the maximum, not a stable population-tail estimate.

### What actually happened

The player refused an offered scouting job, took an alternative route and obtained a star core. Turn 4 granted a usable delayed-light technique. The player subsequently reused the bounded light effect and borrowed a pry tool. These are genuine strengths, not a failed Canon simulation.

However, turns 5–18 mostly exchange one investigation target for another: drain latch, guards, a wet ledger, mineral residue, pipe, inner gate, valve, maintenance hole, another inscribed metal piece. At turn 18 the first formal star-core inscription remains a future possibility. Realm is still rank 0/progress 4; NPC relationships do not turn into a changed identity or an independently usable support network. Turn 18 suggestions are further observation, comparison of a line, or retreat to an NPC. The opportunity changed conditions faster than the player's account changed capabilities.

Checkpoint 9 takes 32,402 ms for planning; checkpoint 17 takes 35,378 ms. Their first narrative receipts are about 36.8 s and 41.9 s and API completion about 51.1 s and 58.1 s. Ordinary turns do not have this extra call. Persistence ranges from 4 to 29 ms in this sample. This points to synchronous model planning, not SQLite micro-optimisation, as the first latency target. ACP setup is included inside model stages and must not be added twice.

## Read-only corpus learning receipt

Source root: `C:\GoogleDrive\笔记\50_Corpora\TGN`. The corpus and original text remain outside Git. The following existing distilled structures were read; this is not a claim to have reread the full novels.

Mechanism cards in `reference-corpus/mechanisms`: `mech-action-space-expansion`, `mech-old-ability-new-use`, `mech-status-recognition`, `mech-resource-liberation`, `mech-mystery-reveal-action`, `mech-pure-upside-payoff`, `mech-map-transition-without-reset`.

Contrast cards in `reference-corpus/contrasts`: `contrast-resource-release`, `contrast-post-payoff-anticipation`, `contrast-first-breakthrough`. These carry STALE/PILOT qualifications: useful contrasts, not an authoritative universal rule set.

Book DNA: `book-dna/rcv0-20-gaowu-quanqiu-gaowu.md` and `book-dna/rcv0-29-xuanhuan-guimi-zhi-zhu.md`. Their evidence is selected windows/REFERENCE_ONLY/PILOT, not complete coverage. In particular, later public responsibility in a work must not be imposed on every early-game reward.

Arcs: `arcs/arc-03-craft-to-second-floor.md`, `arcs/rcv0-29-xuanhuan-guimi-zhi-zhu-arc-01-threshold-to-social-engine.md`, `arcs/rcv0-29-xuanhuan-guimi-zhi-zhu-arc-06-sea-operating-model.md`, `arcs/rcv0-27-dushi-diyi-xulie-ability-to-tactical-tool.md`.

Observations: `observations/obs-08-old-loop-fatigue.md`, `observations/obs-10-enemy-to-credit.md`.

The deep-v1 cross-book directory inspected here was empty; a Fanren path did not contain the completed Book DNA expected. Do not invent coverage or say all suggested novels have been distilled/read in this iteration. The two chosen new inspiration worlds instead use the substantially available Gaowu and Guimi mechanism records.

### Responsibility map

| Layer | What belongs here | What does not |
|---|---|---|
| Authored world / World Forge | Distinct resource-to-power grammar, valuable first opportunities, social recognition and map expansion; optional four-field growthGrammar | One universal five-tier ladder, copied story events, guaranteed reward schedule |
| Low-frequency Story Brain | A stage-level desire, conversion into a usable return, and what the character can do afterwards; NPC repricing and distinct investment routes | Replacing every stage goal with another local inspection, deciding the player's route |
| Narrator | Resolve the player's actual attempted scope, author previously unknown facts within rules, show the result and propose only its actual state effects | Infinite qualification doors, possible invitations recorded as acquired rights, unconditional success |
| Persistent Canon | Actual bounded non-item leverage, disclosed actionable offers and their settlement, existing abilities/items/NPCs/realm retained | A second inventory, passive auto-income, a hidden aggregate progression score |
| Inspiration only | Alternative resource loops, contrast cases, forms of public proof, old-ability/new-context combinations | Entire corpus in every prompt, mandatory cost after each win, every world turning into governance |

## Candidate state and contract

`state.progression = {version:1, leverage:[], opportunities:[]}` is added to new seeds. Old saves receive an empty ledger only on their next successful turn. There is no retroactive award, destructive migration or mutation of older prose. The same existing SQLite state/turn/ledger transaction commits the new fields atomically.

Skills remain capabilities and carried possessions remain inventory. Leverage is reserved for actual bounded relationship services, access, identity, enterprises or property: name, effect, scope, optional known NPC link, earned turn, active/revoked state and actual later uses. It never pays automatic money. `relationship` grants must link to an NPC already in Canon, including one introduced legitimately in the same turn. A friendly attitude alone does not constitute a service.

An opportunity is a disclosed, actionable way to gain something useful, not an author plan or a promise the player made. Its known payoff/approach remain stable under its ID. The player may decline, trade away, or lose it without a forced reward. A settlement with an actual same-turn durable delta is classified as fulfilled/materialized; knowledge-only resolution is answered/materialized:false. This heuristic does not prove that an incidental item update is the promised payoff. Unresolved offers and recent settlements remain in hot state; complete history remains in turns and the Canon ledger.

**Rejected after actual candidate-A failures:** mandatory exact substring quotes and the rule that every fulfilment must grant an asset. Quote mismatches repeatedly triggered expensive repair; the materialization gate could induce the repair model to invent a skill just to satisfy validation. The live contract no longer requests those quotes or repairs knowledge-only answers into material rewards. Legacy evidence is optional annotation, not trusted proof. Structural validation still enforces known-NPC links, active rights, IDs, bounded fields, inventory and realm constraints. It cannot prove all NPC motivations, prices or partial-resource consumption from prose. The full visible narrative and state event remain the audit evidence; actual reading is indispensable.

No additional inference call, judge, automatic rewrite or per-turn reward quota is introduced. The existing conditional repair remains the only recovery model call. Offers are limited to six simultaneously open, and each operation family to three changes per turn, for context size rather than a gameplay schedule. Forty leverage entries is the explicit current hot-state capacity; do not claim indefinitely scalable dynasty simulation.

Original desire and selected advantage stay in the growth horizon after a local `goal` changes. The authored opening supplies the first horizon without a model call. Story Brain can revise the stage when actual player intent changes, and old plans still load. Near-breakthrough planning no longer repeats every turn merely because progress stays above 90 in the same realm; periodic checks still apply. The baseline never reached 90, so that fix is an offline-covered correctness improvement, not a measured speed gain in that sample.

## Measurement and mobile separation

The old `firstReaderVisibleMs` remains a compatibility alias for **server first narrative SSE dispatch**. New traces explicitly expose `firstNarrativeSseMs`; browser fields are null in server-only measurements. HTTP/input validation, planner context, parse, reducer validation and repair parsing are separate stages. Server `apiCompleteMs` marks readiness to dispatch the committed completion event; the browser separately records receiving it and presenting actionable choices.

`eval/progression-browser.mjs` can make the real ACP player submit through the actual mobile-width UI. Its response clone measures SSE receipts; the UI's rAF markers independently approximate first feedback, first narrative, committed complete reception and choices ready. This is local Chrome emulation, not physical Android/iPhone glass-to-glass timing, WAN performance or a human waiting-tolerance claim. The fixed fixture in `progression-browser-smoke.mjs` validates this transport only and is never counted as a real ACP sample.

Mobile baseline reproduced an actual user-up-scroll defect with committed ACP prose replay: the later stream pulls the reader back to the latest text. Before/after geometry and screenshots are under `artifacts/progression-v080/baseline-mobile/`. Detailed fix and mobile-specific tests belong in `PROGRESSION_MOBILE.md`.

## Experiment decisions

Final evidence includes 18-turn baseline stars, 18-turn treatment stars, 16-turn independent beast play stopped by a preparation timeout, and 18-turn masked-world continuation: 70 committed turns across the four principal trajectories, not counting inherited turns twice. Earlier quote-gate candidates and a zero-turn martial-world preparation failure remain recorded separately. The two interruption continuations retain original Canon and label mixed source versions; they are not a randomized paired A/B. Literal quote gates and mandatory materialization gates were rejected. The default planner effort remains medium after inconclusive matched-context low-effort probes. Compact planning removes duplicated Canon output but has not demonstrated a stable overall speedup. Mobile geometry and truthful visible-frame timing were accepted from the final 32-check replay plus actual browser runs. Real prose still shows over-verification, transactional task loops, limited identity change and resource-description inconsistencies. V080_RESULTS.md and the curated COMPARISON.json contain the final measurements and next priorities.
