import test from "node:test";
import assert from "node:assert/strict";
import { StreamingNarratorParser } from "../src/output-parser.js";
import { VALID_NARRATOR_OUTPUT } from "./fixtures/narrator-output.js";

test("stream parser emits narrative before structured JSON across tiny chunks", () => {
  const visible = [];
  const parser = new StreamingNarratorParser((chunk) => visible.push(chunk));
  for (let index = 0; index < VALID_NARRATOR_OUTPUT.length; index += 3) parser.push(VALID_NARRATOR_OUTPUT.slice(index, index + 3));
  const result = parser.finish();
  assert.match(visible.join(""), /药市的灯笼/);
  assert.doesNotMatch(visible.join(""), /TGN_DELTA_JSON|choices/);
  assert.equal(result.choices.length, 3);
  assert.match(result.narrative, /选择仍在他手里/);
});

test("stream parser rejects output without delimiter", () => {
  const parser = new StreamingNarratorParser();
  parser.push("只有正文");
  assert.throws(() => parser.finish(), { code: "INVALID_OUTPUT" });
});
