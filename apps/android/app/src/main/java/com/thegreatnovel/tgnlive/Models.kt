package com.thegreatnovel.tgnlive

import org.json.JSONArray
import org.json.JSONObject
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

fun JSONObject.str(key: String, fallback: String = ""): String = if (isNull(key)) fallback else optString(key, fallback)
fun JSONObject.obj(key: String): JSONObject = optJSONObject(key) ?: JSONObject()
fun JSONObject.objects(key: String): List<JSONObject> = optJSONArray(key)?.let { a -> (0 until a.length()).mapNotNull { a.optJSONObject(it) } } ?: emptyList()
fun json(vararg pairs: Pair<String, Any?>) = JSONObject().apply { pairs.forEach { (k,v) -> put(k,v ?: JSONObject.NULL) } }
data class World(val raw: JSONObject) { val id = raw.str("id"); val title = raw.str("title"); val powers = raw.objects("powers") }
data class Turn(val raw: JSONObject) {
    val index = raw.optInt("index"); val language = raw.str("language", "zh")
    val action = raw.str("action"); val narrative = raw.str("narrative")
    val choices = raw.objects("choices")
}
data class Game(val raw: JSONObject) {
    val id = raw.str("id"); val title = raw.str("title"); val version = raw.optInt("version")
    val state = raw.obj("state"); val language = raw.str("language", "zh")
    val turns = raw.objects("turns").map(::Turn)
    // Flatten canonical paragraphs once per authoritative response, never per SSE delta.
    val paragraphs = turns.flatMap { turn -> listOf(Paragraph(headerKey(id, turn.index), turn.action, turn.language, turn.index, true)) + paragraphs(id, turn.index, turn.narrative, turn.language) }
}
data class Paragraph(val key: String, val text: String, val language: String, val turn: Int, val header: Boolean = false)
fun headerKey(game: String, turn: Int) = "$game:$turn:header"
fun paragraphs(game: String, turn: Int, text: String, language: String): List<Paragraph> = text.replace("\r\n", "\n").split(Regex("\n\\s*\n|\n")).filter { it.isNotBlank() }.mapIndexed { i, p -> Paragraph("$game:$turn:$i", p.trim(), language, turn) }
data class Pending(val gameId: String, val requestId: String, val expectedVersion: Int, val action: String, val language: String, val terminal: Boolean = false) {
    fun body() = json("requestId" to requestId, "expectedVersion" to expectedVersion, "action" to action, "language" to language)
    fun stored() = body().put("gameId",gameId).put("terminal",terminal)
    companion object { fun read(j: JSONObject) = Pending(j.str("gameId"),j.str("requestId"),j.optInt("expectedVersion"),j.str("action"),j.str("language","zh"),j.optBoolean("terminal")) }
}
enum class Recovery { REFRESH_ONLY, RETRY_SAME, RETRY_NEW }
fun recovery(version: Int, pending: Pending) = when { version != pending.expectedVersion -> Recovery.REFRESH_ONLY; pending.terminal -> Recovery.RETRY_NEW; else -> Recovery.RETRY_SAME }
enum class HttpDisposition { AUTH, UNAVAILABLE, ERROR, JSON, SSE, INVALID }
fun classifyHttp(status: Int, contentType: String): HttpDisposition = when {
    status in 300..399 || status == 401 || status == 403 -> HttpDisposition.AUTH
    status >= 500 -> HttpDisposition.UNAVAILABLE
    status !in 200..299 -> HttpDisposition.ERROR
    contentType.contains("text/html",ignoreCase=true) -> HttpDisposition.AUTH
    contentType.contains("text/event-stream",ignoreCase=true) -> HttpDisposition.SSE
    contentType.contains("application/json",ignoreCase=true) -> HttpDisposition.JSON
    else -> HttpDisposition.INVALID
}
data class ReaderLayoutPolicy(val hideHeader: Boolean, val hideToolbar: Boolean, val inlineAction: Boolean, val maxInputLines: Int, val showSuggestions: Boolean)
fun readerLayoutPolicy(availableHeight: Float, keyboardVisible: Boolean, fontScale: Float): ReaderLayoutPolicy {
    val inline = availableHeight < 200f * fontScale.coerceAtLeast(1f) || (keyboardVisible && availableHeight < 260f)
    return ReaderLayoutPolicy(
        hideHeader=inline || (keyboardVisible && availableHeight < 360f),
        hideToolbar=keyboardVisible || availableHeight < 360f,
        inlineAction=inline,
        maxInputLines=if(inline) 1 else if(keyboardVisible || availableHeight < 420f || fontScale >= 1.5f) 2 else 4,
        showSuggestions=!keyboardVisible && availableHeight >= 420f * fontScale.coerceAtLeast(1f)
    )
}
/** Ticket check also rejects non-cooperative IO that returns after cancellation. */
class OperationGate {
    @Volatile var current: Int=0; private set
    fun next(): Int = ++current
    suspend fun check(ticket: Int) { currentCoroutineContext().ensureActive(); if(ticket != current) throw CancellationException("Superseded operation") }
}
fun shouldClearSubmittedDraft(current: String, atTap: String, submitted: String) = current == atTap && current.trim() == submitted
fun hasMajorGrowth(before: JSONObject, after: JSONObject, metrics: JSONObject): Boolean {
    val oldRealm=before.obj("realm"); val newRealm=after.obj("realm")
    if(newRealm.optInt("rank") > oldRealm.optInt("rank") || (newRealm.optInt("rank") >= oldRealm.optInt("rank") && newRealm.str("name").isNotBlank() && newRealm.str("name") != oldRealm.str("name"))) return true
    val oldSkills=before.objects("capabilities").map { it.str("id") }.toSet()
    if(after.objects("capabilities").any { it.str("id").isNotBlank() && it.str("id") !in oldSkills }) return true
    val explicitAsset=metrics.objects("changeKinds").any { it.str("field") == "leverage" && it.str("op") == "add" }
    val oldAssets=before.obj("progression").objects("leverage").map { it.str("id") }.toSet()
    return explicitAsset && after.obj("progression").objects("leverage").any { it.str("id") !in oldAssets && it.str("status") == "active" && it.str("kind") in setOf("identity","enterprise","property") }
}

/** Streaming parser consumes decoded UTF-8 characters. Reader retains partial codepoints. */
class SseParser(private val emit: (String, String) -> Unit) {
    private val line = StringBuilder(); private val data = mutableListOf<String>(); private var event = "message"; private var skipLf = false
    fun feed(chars: CharSequence) { for (c in chars) {
        if (skipLf && c == '\n') { skipLf = false; continue }; skipLf = false
        when(c) { '\r' -> { consumeLine(); skipLf = true }; '\n' -> consumeLine(); else -> line.append(c) }
    } }
    private fun consumeLine() {
        val value = line.toString(); line.clear()
        if (value.isEmpty()) { dispatch(); return }
        if(value.startsWith(':')) return
        val key = value.substringBefore(':'); val body = value.substringAfter(':', "").removePrefix(" ")
        when(key) { "event" -> event = body; "data" -> data.add(body) }
    }
    private fun dispatch() { if(data.isNotEmpty()) emit(event, data.joinToString("\n")); data.clear(); event = "message" }
    // SSE dispatch requires the blank line. EOF never manufactures a terminal event.
    fun finish() { line.clear(); data.clear(); event="message" }
}
