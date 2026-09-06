# TGN Live UI

## Frontend contract

The static UI lives under `public/` and assumes the server serves it at `http://127.0.0.1:4317`.

- `GET /api/health`: shows only the returned provider name, model, status, and optional warning in the visible local/private AI label. No provider failure is rendered as a successful story.
- `GET /api/worlds`: populates world and power cards. A world without `powers` remains unselectable for creation.
- `GET /api/games`, `GET /api/games/:id`, and `POST /api/games`: drive the library, resume, creation, and initial state. After creation the UI sends the contractual `开始我的故事` action.
- `POST /api/games/:id/turns`: uses `fetch`, not `EventSource`, with `Accept: text/event-stream`, a generated `requestId`, and current `game.version` as `expectedVersion`. It consumes `stage`, `text`, `complete`, and `error` SSE frames incrementally. Draft text is labelled provisional and is never presented as committed before `complete`.
- `POST /api/games/:id/cancel`: stops only the visible in-flight turn. The browser aborts its fetch and requests backend cancellation.
- `GET /api/games/:id/export?format=md|txt`: is linked through the UI helper exposed as `window.tgnLive.download(format)` for the backend or future export controls.
- `GET /api/games/:id/metrics`: is not polled; `complete.metrics` is shown raw when supplied. A future backend client can call it without UI schema changes.

All `state` subfields are guarded: absent realm, location, coins, inventory, relationships, goal, facts, turns, choices, descriptions, and dates render as explicit unavailable states rather than throwing.

## Selectors for UI checks

- `[data-game-id]` resume a game.
- `#new-game-button`, `#hero-name`, `input[name="world"]`, `input[name="power"]`, `#adult-confirmation`, `#create-game-button` cover onboarding.
- `#narrative`, `#provisional-turn`, `#generation-status`, `#stop-turn`, `#retry-turn`, `#suggested-actions`, and `#custom-action` cover the active turn.
- `#status-rail`, `#status-drawer`, `#reader-toggle`, `#open-observability`, and `#observability-panel` cover app chrome.

## Verification limitations

`ui-tests/fixture-playwright.mjs` is isolated and intercepts every API call. It proves visual flows and client SSE parsing, not ACP generation or persistence. Live validation should use a short opening turn only while the backend is available; do not interpret fixture timing or fixture prose as provider evidence.

Fixture verification on 2026-09-07 covered valid adult onboarding, library resume, mobile status drawer, a 390px no-horizontal-overflow assertion, incremental `stage`/`text`/`complete` SSE handling, and desktop rendering. Screenshots: `artifacts/ui/fixture-mobile.png` and `artifacts/ui/fixture-desktop.png`. The harness reused a local Chrome executable and a read-only Playwright install from another project; it changed no dependencies.

No image-generation endpoint is wired in this release. The CSS-only atmosphere is intentional; illustration milestones need backend metadata and a truthful generated asset before display.

The prototype exposes model/provider values returned by the server. The server must explicitly set narrator/player `reasoning_effort=low` and planner/judge `reasoning_effort=medium`; the UI never sends model configuration or inherits an `ultra` setting. The frontend development session used `gpt-5.6-terra` at `high`; `gpt-6-astra` is intentionally excluded because generation was reported to fail with a Codex-version error.

## Final real browser verification (v0.4.0)
2026-09-06T23:10Z: artifacts/ui/final-live-v040b contains actual Chrome two-turn generation with no API stubs. All seven functional checks pass:3choices,mobile/desktop overflow,exact refresh,2accepted turns,MD download,reader mode. First narrative paint3454.2/3357.9ms; observed commit15152.8/14063.4ms. Three mobile choices subsequently passed real pointer hit-testing in mobile-hitcheck.json. The test retains issues_found because Chrome reported two net::ERR_ABORTED request events despite saved rounds; network cleanup cause is not proven. First attempt final-live-v040 failed at a hidden radio test locator before creating a game; test now clicks the visible card. No physical Android keyboard validation.

