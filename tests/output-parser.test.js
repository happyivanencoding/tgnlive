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


test("narrative-end fires once after the last visible character, before metadata is complete", () => {
  const events=[];
  const parser=new StreamingNarratorParser(text=>events.push({type:"text",text}),info=>events.push({type:"end",...info}));
  const divider="\n<TGN_DELTA_JSON>\n";
  const body="世界正在改变。\n你决定向前。";
  for(const character of body+divider) parser.push(character);
  assert.equal(events.filter(e=>e.type==="end").length,1);
  assert.equal(events.at(-1).type,"end");
  assert.equal(events.at(-1).characters,body.length);
  assert.equal(events.filter(e=>e.type==="text").map(e=>e.text).join(""),body);
  assert.throws(()=>parser.finish(),{code:"INVALID_OUTPUT"});
  parser.push('{"choices":[],"delta":{}}');
  assert.equal(parser.finish().narrative,body);
  assert.equal(events.filter(e=>e.type==="end").length,1);
});

test("a chunk pause or missing delimiter never invents narrative completion", () => {
  let ended=false;
  const parser=new StreamingNarratorParser(()=>{},()=>{ended=true});
  parser.push("这只是暂时停顿的正文。");parser.push("");
  assert.equal(ended,false);
  assert.throws(()=>parser.finish(),{code:"INVALID_OUTPUT"});
  assert.equal(ended,false);
});
