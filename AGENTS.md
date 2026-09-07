# TGN Live workspace rules

This is the independent local playable-novel MVP at `C:\dev\tgn_live`. It is not `C:\dev\tgn-story-mvp` and must not change that project's production pipeline, books, branches, or handoff files.

For text-only Narrator, Story Brain, Player, or Judge requests: do not read project files or call tools; use only the supplied game observations. The file-reading and development workflow instructions below apply to development tasks, not story-generation calls.

Read `docs/MVP_SPEC.md`, `DEEP_CONTEXT_HANDOFF.md`, and the current experiment report before development. The product source is `docs/sources/shared_conversation.md`; its market numbers are historical source discussion, not independently validated claims made by this implementation.

## Product invariants
- A playable cultivation novel, not a generic character chat shell. Respect refusal, lateral action, tangible growth and NPC motives.
- Canonical SQLite state/events are authoritative; model output is an untrusted proposal. Do not silently publish success text after rejecting its state transition.
- Three suggestions plus free input. Streaming previews are provisional; failed/cancelled/invalid generations do not become canon.
- Short fast narrator calls; low-frequency short story planning. Do not import the full TGN batch pipeline or add unconditional model stages per turn.
- Never substitute fixture prose after a live provider error. Demo, deterministic fixtures, replay and real adaptive ACP play are separate experiment modes.

## Runtime and safety
- Trusted single-owner prototype, default loopback port 4317. The user authorized remote play on 2026-09-07: only `live.thegreatnovel.com` through the existing Cloudflare Tunnel and owner-only Access. Validate Access JWTs at the origin. Do not expose anonymous routes, relax global AgentDock policy or terminate unrelated agents.
- Read the actual advertised ACP configuration and verify a real call. In the initial environment, Astra was advertised but incompatible with the installed Codex; Sol/Luna actual probes passed.
- Set reasoning explicitly: narrator/player low, planner/judge medium by default. Inherited ultra is not acceptable for real-time benchmarks.
- Observed ACP global concurrent prompt limit is two. Bound concurrency, queue/retry and total time. Release owned sessions on all outcomes.
- Narration/player/judge sessions use empty workspace and read-only mode, no tools, no additional directories. Unexpected tool events fail/cancel. This is not a guarantee against hostile multi-tenant prompt injection; keep the deployment private.
- Never print, commit or send local tokens, DPAPI plaintext, model private reasoning, local credentials or unrelated personal files. DPAPI authentication stays in process memory and never reaches the browser.

## Evidence and changes
- Preserve exact action traces, final outputs, actual model/effort/session/run identifiers and measured stage timestamps. Do not overwrite baseline artifacts.
- Distinguish first provider final-answer text, first narrative, API receipt and browser paint; separate player deliberation from app generation.
- Unavailable internal queue/compute time, billable tokens and monetary costs remain null. A context usage field is not automatically a billable token count.
- Agent reader scores are subjective test evidence, not human retention or proof of hundreds-turn continuity.
- After an accepted change: run relevant tests, update handoff/report and record reproduction commands. No remote push without user authorization. Keep runtime databases, full local telemetry, secrets and raw share HTML out of source-control commits.
