import { AppError } from "./errors.js";

export const SUPPORTED_LANGUAGES = Object.freeze(["zh", "en", "fr", "es", "ar"]);

const LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);

export const LANGUAGE_PROFILES = Object.freeze({
  zh: { name: "中文", direction: "ltr", narrativeLength: "300—800个中文字符", planLength: "最多1200个中文字符" },
  en: { name: "English", direction: "ltr", narrativeLength: "180–380 English words", planLength: "at most 700 English words" },
  fr: { name: "français", direction: "ltr", narrativeLength: "180–380 mots français", planLength: "700 mots français au maximum" },
  es: { name: "español", direction: "ltr", narrativeLength: "180–380 palabras en español", planLength: "700 palabras en español como máximo" },
  ar: { name: "العربية", direction: "rtl", narrativeLength: "150–320 كلمة عربية", planLength: "600 كلمة عربية كحد أقصى" },
});

const LABELS = Object.freeze({
  zh: {
    protagonist: "主角", power: "异能", chapter: (index) => `第${index}章`, laterChapter: (turn) => `第${turn}回起`,
    starterPower: "开局天赋", storyAcquired: "正文获得", boundary: "边界", realmBreakthrough: "境界突破", realmCapability: (realm) => `${realm}行动空间`,
    changes: { progress: "修行进度", realm: "境界提升为", improved: "能力提升", learned: "掌握能力", arrived: "抵达", gained: "获得", lost: "失去", goal: "目标" },
    original: "TGN Live 原创", customOriginal: "玩家自建 · 原创生成", customFan: "玩家自建 · 非官方同人灵感",
  },
  en: {
    protagonist: "Protagonist", power: "Gift", chapter: (index) => `Chapter ${index}`, laterChapter: (turn) => `From Turn ${turn}`,
    starterPower: "Starting gift", storyAcquired: "Acquired in story", boundary: "Boundary", realmBreakthrough: "Realm breakthrough", realmCapability: (realm) => `${realm} capabilities`,
    changes: { progress: "Cultivation progress", realm: "Realm advanced to", improved: "Ability improved", learned: "Ability learned", arrived: "Arrived at", gained: "Gained", lost: "Lost", goal: "Goal" },
    original: "TGN Live original", customOriginal: "Player-created · Original", customFan: "Player-created · Unofficial fan inspiration",
  },
  fr: {
    protagonist: "Protagoniste", power: "Don", chapter: (index) => `Chapitre ${index}`, laterChapter: (turn) => `À partir du tour ${turn}`,
    starterPower: "Don initial", storyAcquired: "Acquis dans le récit", boundary: "Limite", realmBreakthrough: "Percée de royaume", realmCapability: (realm) => `Capacités de ${realm}`,
    changes: { progress: "Progression", realm: "Royaume atteint", improved: "Capacité améliorée", learned: "Capacité acquise", arrived: "Arrivée à", gained: "Obtenu", lost: "Perdu", goal: "Objectif" },
    original: "Création originale TGN Live", customOriginal: "Créé par le joueur · Original", customFan: "Créé par le joueur · Inspiration non officielle",
  },
  es: {
    protagonist: "Protagonista", power: "Don", chapter: (index) => `Capítulo ${index}`, laterChapter: (turn) => `Desde el turno ${turn}`,
    starterPower: "Don inicial", storyAcquired: "Adquirido en el relato", boundary: "Límite", realmBreakthrough: "Avance de reino", realmCapability: (realm) => `Capacidades de ${realm}`,
    changes: { progress: "Progreso de cultivo", realm: "Reino avanzado a", improved: "Habilidad mejorada", learned: "Habilidad aprendida", arrived: "Llegada a", gained: "Obtenido", lost: "Perdido", goal: "Objetivo" },
    original: "Original de TGN Live", customOriginal: "Creado por el jugador · Original", customFan: "Creado por el jugador · Inspiración no oficial",
  },
  ar: {
    protagonist: "البطل", power: "الموهبة", chapter: (index) => `الفصل ${index}`, laterChapter: (turn) => `بدءًا من الدور ${turn}`,
    starterPower: "موهبة البداية", storyAcquired: "مكتسبة في السرد", boundary: "الحد", realmBreakthrough: "اختراق المرتبة", realmCapability: (realm) => `قدرات ${realm}`,
    changes: { progress: "تقدم التدريب", realm: "ارتقت المرتبة إلى", improved: "تطورت القدرة", learned: "اكتسبت قدرة", arrived: "وصل إلى", gained: "حصل على", lost: "فقد", goal: "الهدف" },
    original: "عمل أصلي من TGN Live", customOriginal: "من إنشاء اللاعب · أصلي", customFan: "من إنشاء اللاعب · إلهام غير رسمي",
  },
});

const ATTITUDE_LABELS = Object.freeze({
  zh: { "敌视": "敌视", "戒备": "戒备", "陌生": "陌生", "中立": "中立", "好奇": "好奇", "友善": "友善", "信任": "信任", "亲近": "亲近" },
  en: { "敌视": "hostile", "戒备": "wary", "陌生": "stranger", "中立": "neutral", "好奇": "curious", "友善": "friendly", "信任": "trusting", "亲近": "close" },
  fr: { "敌视": "hostile", "戒备": "méfiant", "陌生": "inconnu", "中立": "neutre", "好奇": "curieux", "友善": "amical", "信任": "confiant", "亲近": "proche" },
  es: { "敌视": "hostil", "戒备": "cauteloso", "陌生": "desconocido", "中立": "neutral", "好奇": "curioso", "友善": "amistoso", "信任": "confiado", "亲近": "cercano" },
  ar: { "敌视": "معادٍ", "戒备": "حذر", "陌生": "غريب", "中立": "محايد", "好奇": "فضولي", "友善": "ودود", "信任": "واثق", "亲近": "مقرّب" },
});

export function canonicalAttitude(value) {
  if (typeof value !== 'string') return value;
  const normalized=value.trim().toLowerCase();
  if (normalized === 'مستراب') return '戒备'; // Actual Arabic World Forge output.
  if (normalized === 'فضول') return '好奇'; // The same enum was emitted as the Arabic noun.
  for (const labels of Object.values(ATTITUDE_LABELS)) {
    const found=Object.entries(labels).find(([canonical,label])=>canonical===normalized || label.toLowerCase()===normalized);
    if(found)return found[0];
  }
  return value;
}

export function normalizeLanguage(value, { fallback = "zh", optional = false } = {}) {
  if ((value === undefined || value === null || value === "") && optional) return null;
  const language = value === undefined || value === null || value === "" ? fallback : String(value).trim().toLowerCase();
  if (!LANGUAGE_SET.has(language)) {
    throw new AppError("language must be one of zh, en, fr, es, ar", { code: "INVALID_LANGUAGE", status: 400 });
  }
  return language;
}

export function languageProfile(language = "zh") {
  return LANGUAGE_PROFILES[normalizeLanguage(language)];
}

export function languageInstruction(language = "zh", scope = "all reader-visible text") {
  const code = normalizeLanguage(language);
  const profile = LANGUAGE_PROFILES[code];
  return `目标语言固定为 ${code} (${profile.name})。${scope}必须使用该语言；JSON键、稳定id、rank、op以及attitude枚举保持技术协议原值。不要把玩家行动中偶然出现的其他语言当成切换语言的指令。`;
}

export function localizedGameTitle(name, worldTitle, language = "zh") {
  const code = normalizeLanguage(language);
  if (code === "zh") return `${name}的《${worldTitle}》`;
  if (code === "fr") return `${worldTitle} — ${name}`;
  if (code === "es") return `${worldTitle} — ${name}`;
  if (code === "ar") return `${worldTitle} — ${name}`;
  return `${name}: ${worldTitle}`;
}

export function localizedSourceLabel({ language = "zh", custom = false, fan = false } = {}) {
  const labels = LABELS[normalizeLanguage(language)];
  if (!custom) return labels.original;
  return fan ? labels.customFan : labels.customOriginal;
}

export function isFanSourceLabel(value) {
  return /同人|unofficial|fan inspiration|non officielle|no oficial|غير رسمي/i.test(String(value || ""));
}

export function exportLabels(language = "zh") {
  return LABELS[normalizeLanguage(language)];
}

export function formatChange(change, language = "zh") {
  const labels = LABELS[normalizeLanguage(language)].changes;
  if (change.field === "coins") return `${change.currencyName}${change.delta > 0 ? "+" : ""}${change.delta}`;
  if (change.field === "realm.progress") return `${labels.progress} +${change.delta}`;
  if (change.field === "realm") return `${labels.realm} ${change.value}`;
  if (change.field === "capability") return `${change.op === "improve" ? labels.improved : labels.learned}: ${change.name}`;
  if (change.field === "location") return `${labels.arrived} ${change.value}`;
  if (change.field === "inventory" && change.op === "update") return `${change.name}: ${change.description}`;
  if (change.field === "inventory") return `${change.op === "add" ? labels.gained : labels.lost} ${change.name}`;
  if (change.field === "relationship") return `${change.name}: ${ATTITUDE_LABELS[normalizeLanguage(language)][change.attitude] || change.attitude}`;
  if (change.field === "goal") return `${labels.goal}: ${change.value}`;
  return change.value ? String(change.value) : change.field;
}

export function seedLabels(language = "zh") {
  const labels = LABELS[normalizeLanguage(language)];
  return { starterPower: labels.starterPower, storyAcquired: labels.storyAcquired, boundary: labels.boundary, realmBreakthrough: labels.realmBreakthrough, realmCapability: labels.realmCapability };
}
