import test from 'node:test';
import assert from 'node:assert/strict';
import { isFanSourceLabel } from '../src/i18n.js';
import { createSeedState, validateWorldDefinition } from '../src/worlds.js';
import { PROGRESSION_WORLDS, localizeProgressionWorld } from '../src/progression-worlds.js';

const LANGUAGES = ['zh', 'en', 'fr', 'es', 'ar'];
const NON_OFFICIAL_LABELS = {
  zh: /非官方同人灵感/,
  en: /Unofficial fan inspiration/,
  fr: /Inspiration non officielle/,
  es: /Inspiración no oficial/,
  ar: /إلهام غير رسمي/,
};
const TECHNICAL_TEXT_FIELDS = new Set(['id', 'language', 'attitude']);

function collectReadableStrings(value, path = [], output = []) {
  if (typeof value === 'string') {
    if (!TECHNICAL_TEXT_FIELDS.has(path.at(-1))) output.push({ path: path.join('.'), value });
    return output;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectReadableStrings(item, [...path, String(index)], output));
    return output;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectReadableStrings(item, [...path, key], output);
  }
  return output;
}

function stableStructure(world) {
  return {
    id: world.id,
    realmRanks: world.powerSystem.realms.map((realm) => realm.rank),
    powerIds: world.powers.map((power) => power.id),
    npcMoveIds: world.opening.npcMoves.map((npc) => npc.id),
    inventory: world.seed.inventory.map((item) => [item.id, item.qty]),
    relationships: world.seed.relationships.map((npc) => [npc.id, npc.attitude]),
    capabilities: world.seed.capabilities.map((ability) => ability.id),
    coins: world.seed.coins,
  };
}

test('progression worlds are distinct, valid Chinese definitions with bounded growth grammar', () => {
  assert.deepEqual(PROGRESSION_WORLDS.map((world) => world.id), ['masked-tides', 'martial-frontier']);
  assert.equal(new Set(PROGRESSION_WORLDS.map((world) => world.title)).size, 2);
  assert.deepEqual(PROGRESSION_WORLDS.map((world) => world.powerSystem.realms.length), [6, 7]);

  for (const world of PROGRESSION_WORLDS) {
    assert.doesNotThrow(() => validateWorldDefinition(world));
    assert.equal(world.language, 'zh');
    assert.match(world.sourceLabel, NON_OFFICIAL_LABELS.zh);
    assert.equal(isFanSourceLabel(world.sourceLabel), true);
    assert.deepEqual(Object.keys(world.growthGrammar), ['desire', 'conversion', 'recognition', 'expansion']);
    for (const value of Object.values(world.growthGrammar)) {
      assert.ok(value.length > 20 && value.length <= 480, `${world.id}: invalid growthGrammar length`);
    }
    assert.equal(new Set(world.powers.map((power) => power.id)).size, 3);
    assert.equal(new Set(world.powers.map((power) => power.name)).size, 3);
    assert.equal(new Set(world.powerSystem.realms.map((realm) => realm.name)).size, world.powerSystem.realms.length);
    assert.equal(new Set(world.seed.inventory.map((item) => item.id)).size, world.seed.inventory.length);
    const openingNpcIds = new Set(world.opening.npcMoves.map((npc) => npc.id));
    assert.ok(world.seed.relationships.every((npc) => openingNpcIds.has(npc.id)), `${world.id}: seed relationship must exist in opening`);
    assert.ok(world.seed.inventory.every((item) => !openingNpcIds.has(item.id)), `${world.id}: NPC property cannot appear as player inventory`);
    assert.match(world.opening.milestone, /一到三回合/);
    assert.match(world.opening.continuity.join(''), /玩家.*属于|属于玩家/);
  }
});

for (const language of LANGUAGES) {
  test(`${language}: both progression worlds validate with complete localized readable fields`, () => {
    const titles = [];
    for (const original of PROGRESSION_WORLDS) {
      const world = localizeProgressionWorld(original, language);
      titles.push(world.title);
      assert.notStrictEqual(world, original);
      assert.equal(world.language, language);
      assert.match(world.sourceLabel, NON_OFFICIAL_LABELS[language]);
      assert.equal(isFanSourceLabel(world.sourceLabel), true);
      assert.deepEqual(stableStructure(world), stableStructure(original));
      assert.doesNotThrow(() => validateWorldDefinition(world));
      assert.deepEqual(Object.keys(world.growthGrammar), ['desire', 'conversion', 'recognition', 'expansion']);
      for (const value of Object.values(world.growthGrammar)) assert.ok(value.length <= 480);
      for (const values of [world.powerSystem.realms, world.powers, world.opening.npcMoves, world.seed.inventory, world.seed.relationships, world.seed.capabilities]) {
        assert.equal(new Set(values.map((value) => value.id ?? value.rank)).size, values.length);
        assert.equal(new Set(values.map((value) => value.name)).size, values.length);
      }

      const readable = collectReadableStrings(world);
      assert.ok(readable.length > 70, `${original.id}/${language}: incomplete readable field coverage`);
      assert.ok(readable.every(({ value }) => value.trim().length > 0));
      if (language !== 'zh') {
        const mixed = readable.filter(({ value }) => /\p{Script=Han}/u.test(value));
        assert.deepEqual(mixed, [], `${original.id}/${language}: untranslated Chinese fields`);
      }

      for (const power of world.powers) {
        const state = createSeedState(world, power);
        assert.equal(state.worldId, world.id);
        assert.equal(state.realm.name, world.powerSystem.realms[0].name);
        assert.equal(state.location, world.opening.location);
        assert.deepEqual(state.inventory, world.seed.inventory);
        assert.ok(state.capabilities.some((ability) => ability.id === `power-${power.id}`));
        assert.ok(!JSON.stringify(state).includes('undefined'));
      }
    }
    assert.equal(new Set(titles).size, 2);
  });
}

test('localization returns independent deep copies and rejects unknown world or language', () => {
  const original = PROGRESSION_WORLDS[0];
  const first = localizeProgressionWorld(original, 'en');
  const second = localizeProgressionWorld(original, 'en');
  first.title = 'changed';
  first.seed.inventory[0].name = 'changed item';
  first.growthGrammar.desire = 'changed desire';
  assert.notEqual(second.title, first.title);
  assert.notEqual(second.seed.inventory[0].name, first.seed.inventory[0].name);
  assert.notEqual(original.growthGrammar.desire, first.growthGrammar.desire);
  assert.equal(localizeProgressionWorld({ id: 'unknown-world' }, 'en'), null);
  assert.equal(localizeProgressionWorld(original, 'de'), null);
});
