import { AppError } from "./errors.js";

export const DELIMITER = "\n<TGN_DELTA_JSON>\n";

export class StreamingNarratorParser {
  constructor(onNarrative, onNarrativeComplete) {
    this.onNarrative = onNarrative;
    this.onNarrativeComplete = onNarrativeComplete;
    this.mode = "narrative";
    this.buffer = "";
    this.narrative = "";
    this.structured = "";
  }

  push(chunk) {
    if (typeof chunk !== "string" || !chunk) return;
    if (this.mode === "structured") {
      this.structured += chunk;
      return;
    }
    this.buffer += chunk;
    const delimiterIndex = this.buffer.indexOf(DELIMITER);
    if (delimiterIndex >= 0) {
      this.emitNarrative(this.buffer.slice(0, delimiterIndex));
      this.structured += this.buffer.slice(delimiterIndex + DELIMITER.length);
      this.buffer = "";
      this.mode = "structured";
      // Visible prose is finished; metadata is still unvalidated and is NOT Canon.
      this.onNarrativeComplete?.({ characters: this.narrative.length });
      return;
    }
    const safeLength = Math.max(0, this.buffer.length - DELIMITER.length + 1);
    if (safeLength > 0) {
      this.emitNarrative(this.buffer.slice(0, safeLength));
      this.buffer = this.buffer.slice(safeLength);
    }
  }

  emitNarrative(text) {
    if (!text) return;
    this.narrative += text;
    this.onNarrative?.(text);
  }

  finish() {
    if (this.mode !== "structured") {
      throw new AppError("模型输出缺少结构化状态分隔符", { code: "INVALID_OUTPUT", status: 502, retryable: true });
    }
    const json = extractJsonObject(this.structured);
    return { ...json, narrative: this.narrative.trim() };
  }
}

export function extractJsonObject(text) {
  const trimmed = String(text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new AppError("模型没有返回 JSON 对象", { code: "INVALID_OUTPUT", status: 502, retryable: true });
  }
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch (error) {
    throw new AppError("模型返回的 JSON 无法解析", { code: "INVALID_OUTPUT", status: 502, retryable: true, details: error.message });
  }
}
