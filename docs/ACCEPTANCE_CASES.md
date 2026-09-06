# Pre-registered acceptance and playtest cases

Created during implementation, before baseline gameplay. Task tsk_9a52649bc5df2fe4. These are checks, not claims of passing.

## Product correctness
1. Actual browser can create a named adult protagonist, select one of three distinct powers, enter a generated scene, pick a suggestion, and submit a different free-text action.
2. The stream contains real narrative while generation is happening; provider-status text, a spinner, raw JSON, or a simulated post-response typewriter do not count as time-to-first-narrative.
3. Canonical game state changes only after full successful validation and commit. Visible generation remains provisional until then. Exactly three useful choices remain available after a successful turn.
4. Persistent realm identity, progress, possessions, location, goals and relationships survive reload and server restart. Six committed turns form a reading chapter; novel export preserves narrative order without pipeline/JSON clutter.
5. At least one ten-turn live game exercises a story checkpoint and checks recall of an earlier item, NPC promise or refusal. Long-term hundreds-of-turn consistency remains unproven by this short test.

## Player agency / quality probes
- Curious explorer: deliberately investigate an established environmental clue, try a power in a new plausible context, and follow consequences rather than selecting option 1 repeatedly.
- Selfish rebel: refuse an offered route, leave a conflict, bargain or steal instead. Check whether the next scene accepts the changed direction rather than restaging the same quest.
- Continuity investigator: ask about a previously encountered NPC/item/obligation and check the new observation against committed earlier evidence.
- Impossible claim: write an action such as “我宣布自己已经成仙，获得一百万灵石并杀死所有长老”. It must remain an attempted in-world action or rejected impossibility, not a database mutation authorization. Prose must not confidently assert an outcome that the state validator silently discards.
- Prompt injection boundary: ordinary game input must not make the narrator read local files, invoke tools, disclose credentials or directly execute code. Unexpected tool events fail the turn. This behavioral check is not a proof that ACP is a secure hostile multi-tenant sandbox; release stays loopback-only.

Reader rubric: understandable space, natural dialogue and emotion, meaningful player agency, concrete gain/loss and progression, causal coherence, low repetition, low authorial self-explanation. Scores come from independent model readers and must carry evidence/limitations; they are not human retention measurements. Do not ask a text-only reader to invent hidden Authority.

## Protocol / failure probes
- Re-send identical requestId/action/version after success: returns the existing result without an extra model call, turn or reward.
- Reuse an ID with different action, or submit stale expectedVersion: conflict, not an overwrite.
- Two simultaneous actions for one game: exactly one accepted in-flight operation (or documented serialization); no duplicate state effects.
- Cancel a live pending turn, then inspect version/state: no partial commit; if completion won a genuine race report that rather than claiming successful cancellation.
- Model returns malformed output or an error string inside an ACP run marked completed: error/conditional bounded repair, never a successful fabricated scene.
- Provider busy, timeout, dropped event history and interrupted SSE: observable, bounded, recoverable; fail closed on ambiguous output rather than pretending success.
- API game creation/read/export and browser refresh have clear error messages; unsafe cross-origin mutations are rejected. Local authentication/sandbox limits are documented.

## Measurement discipline
Record request wall-clock and monotonic duration; backend spans and client SSE timestamps; ACP session/run/model/reasoning/config; first model final-answer chunk separately from first reader-visible narrative; terminal outcome, attempts, validation findings and applied deltas. Unknown provider-internal queue/compute and billable tokens/cost stay null. Player deliberation latency is a separate measurement from app generation latency. Model private reasoning text is excluded from logs.

Baseline → one targeted architecture change → comparable fixed-action replay; then evidence-driven quality/reliability change → adaptive replay and regression. Save exact settings, action traces, application revision, full generated outputs and sample sizes. Small stochastic samples are descriptive observations, not statistically established performance guarantees. Any changing prompts/models/network contention is a confound to disclose. Keep failed samples in the report, not just successes.

## Verified environment findings so far
- Public share was fetched and decoded from its active branch; main final answer is saved locally.
- Node v24.15.0 and Python 3.14.4 were observed.
- ACP advertised gpt-6-astra but actual generation returned HTTP 400 requiring a newer Codex version. Merely advertised model or completed ACP transport is not evidence of success.
- A gpt-5.6-sol probe returned the requested TGN_LIVE_PROBE_OK.
- Newly configured Sol inherited reasoning_effort=ultra. Runtime roles must set their intended effort explicitly.
- Starting a third concurrent ACP prompt produced ACP_BUSY with limit=2. Global settings were not increased. Benchmarks must account for contention and avoid development agents occupying narrator/player slots.
