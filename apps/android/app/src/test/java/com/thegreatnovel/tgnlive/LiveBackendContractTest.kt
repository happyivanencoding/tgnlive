package com.thegreatnovel.tgnlive

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File
import java.time.Instant

/** Opt-in read-only LIVE data adapter check. Not an Android UI, auth, streaming, or play test. */
class LiveBackendContractTest {
    @Test fun currentBackendWorldsAndSavesFitTheActualAndroidModelsWithoutMutation() {
        val snapshotPath = System.getenv("TGN_NATIVE_LIVE_SNAPSHOT")
        assumeTrue("Opt-in: first run scripts/capture-live-contract.mjs; never commit private snapshots.", !snapshotPath.isNullOrBlank())
        val snapshot = JSONObject(File(snapshotPath!!).readText(Charsets.UTF_8))
        assertEquals("READ_ONLY_LIVE_BACKEND_CONTRACT_NOT_ANDROID_UI_PLAY", snapshot.str("kind"))
        val age = System.currentTimeMillis() - Instant.parse(snapshot.str("capturedAt")).toEpochMilli()
        assertTrue("Live contract capture must be fresh, not a historical fixture", age in 0..900000)
        val languages = setOf("zh", "en", "fr", "es", "ar")
        for (language in languages) {
            val worlds = snapshot.obj("worlds").obj(language).objects("worlds")
            assertTrue("Real world list is required", worlds.isNotEmpty())
            for (raw in worlds) {
                val world = World(raw)
                assertTrue("World ID and title must survive Android parsing", world.id.isNotBlank() && world.title.isNotBlank())
                assertTrue("World must retain selectable powers", world.powers.isNotEmpty())
                assertTrue("World must retain its independent power system", raw.obj("powerSystem").objects("realms").isNotEmpty())
            }
        }
        val games = snapshot.objects("games")
        assertTrue("Real existing saves are required", games.isNotEmpty())
        assertTrue("Captured games must come from the existing shelf", games.size <= snapshot.obj("shelf").objects("games").size)
        for (envelope in games) {
            val raw = envelope.obj("game")
            val untouched = raw.toString()
            val game = Game(raw)
            assertTrue("Game identity/version must survive Android parsing", game.id.isNotBlank() && game.version >= 0)
            assertTrue("State must remain server-owned", game.state.length() > 0 && game.state === raw.optJSONObject("state"))
            assertEquals(raw.objects("turns").size, game.turns.size)
            assertEquals("Stable paragraph keys must be unique per save", game.paragraphs.size, game.paragraphs.map { it.key }.toSet().size)
            game.turns.forEachIndexed { index, turn ->
                assertTrue("Historical narrative must remain exact", turn.narrative == raw.objects("turns")[index].str("narrative"))
                assertTrue("Historical per-turn language must be recognized", turn.language in languages)
                assertEquals(turn.raw.objects("choices").size, turn.choices.size)
                assertTrue("Every historical turn retains its action header", game.paragraphs.any { it.header && it.key == headerKey(game.id, turn.index) })
            }
            assertTrue("Android adaptation must not rewrite server Canon or history", untouched == raw.toString())
        }
    }
}
