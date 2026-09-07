import fs from "node:fs";
import path from "node:path";
import { createTgnLive } from "./index.js";

const runtime = createTgnLive();
fs.mkdirSync(runtime.config.runtimeDir, { recursive: true });

runtime.server.listen(runtime.config.port, runtime.config.host, () => {
  // Do not recover from a constructor: a second process that fails to bind must not touch a live request.
  const interrupted = runtime.store.recoverInterruptedRequests();
  if (interrupted) process.stdout.write(`Recovered ${interrupted} interrupted request(s); Canon unchanged.\n`);
  const address = runtime.server.address();
  const record = {
    pid: process.pid,
    host: runtime.config.host,
    port: address.port,
    startedAt: new Date().toISOString(),
    databasePath: runtime.config.databasePath,
    narratorModel: runtime.config.narratorModel,
    narratorReasoning: runtime.config.narratorReasoning,
    plannerModel: runtime.config.plannerModel,
    plannerReasoning: runtime.config.plannerReasoning,
    stdoutLogPath: process.env.TGN_SERVER_STDOUT_LOG || null,
    stderrLogPath: process.env.TGN_SERVER_STDERR_LOG || null,
  };
  fs.writeFileSync(path.join(runtime.config.runtimeDir, "server.json"), JSON.stringify(record, null, 2), "utf8");
  process.stdout.write(`TGN Live listening on http://${record.host}:${record.port}\n`);
});

let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  setTimeout(() => process.exit(1), 8000).unref();
  for (const { controller } of runtime.inFlight.values()) controller.abort(new Error('server shutting down'));
  for (const controller of runtime.worldInFlight.values()) controller.abort(new Error('server shutting down'));
  await runtime.generationService.close?.();
  runtime.server.close(() => {
    runtime.store.close();
    process.stdout.write(`TGN Live stopped (${signal})\n`);
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
