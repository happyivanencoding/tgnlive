package com.thegreatnovel.tgnlive

import android.content.Context
import android.util.AtomicFile
import android.os.SystemClock
import com.thegreatnovel.tgnlive.auth.AccessAuth
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.File
import java.io.IOException
import java.util.concurrent.TimeUnit
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

class ApiFailure(val code: String, val status: Int = 0) : IOException(code)
data class ServerEvent(val type: String, val data: JSONObject, val receivedAt: Long = SystemClock.elapsedRealtime())

class SnapshotCache(context: Context) {
    private var acceptingWrites = true
    private val accountRoot = File(context.noBackupFilesDir, "account")
    private val account = File(accountRoot, if(BuildConfig.BACKEND_URL == "https://live.thegreatnovel.com") "production" else "loopback-4317")
    private val settings = File(context.noBackupFilesDir, "reader-settings.json")
    private fun file(key: String) = File(account, key.replace(Regex("[^a-zA-Z0-9_-]"), "_") + ".json")
    @Synchronized fun read(key: String): JSONObject? = readFile(file(key))
    @Synchronized fun write(key: String, value: JSONObject) { if(acceptingWrites) writeFile(file(key), value) }
    @Synchronized fun delete(key: String) { AtomicFile(file(key)).delete() }
    @Synchronized fun preferences(): JSONObject = readFile(settings) ?: JSONObject()
    @Synchronized fun preferences(value: JSONObject) = writeFile(settings,value)
    @Synchronized fun purge() { acceptingWrites=false; accountRoot.deleteRecursively() }
    @Synchronized fun activate() { acceptingWrites=true }
    private fun readFile(file: File): JSONObject? = runCatching { JSONObject(AtomicFile(file).openRead().bufferedReader().use { it.readText() }) }.getOrNull()
    private fun writeFile(file: File, value: JSONObject) {
        file.parentFile?.mkdirs(); val atomic = AtomicFile(file); val stream = atomic.startWrite()
        try { stream.write(value.toString().toByteArray(Charsets.UTF_8)); atomic.finishWrite(stream) }
        catch(e: Exception) { atomic.failWrite(stream); throw e }
    }
}

class Repository(val auth: AccessAuth, val cache: SnapshotCache, val base: String = BuildConfig.BACKEND_URL) {
    val production = base == "https://live.thegreatnovel.com"
    private val client = OkHttpClient.Builder().followRedirects(false).followSslRedirects(false)
        .retryOnConnectionFailure(false).connectTimeout(15,TimeUnit.SECONDS).readTimeout(45,TimeUnit.SECONDS)
        .callTimeout(180,TimeUnit.SECONDS).build()
    @Volatile private var streamCall: Call? = null
    private fun request(path: String, body: JSONObject? = null): Request {
        require(path.startsWith("/api/"))
        val builder = Request.Builder().url(base + path).header("Accept", "application/json, text/event-stream")
        // No cookie jar and no redirects: credentials can only reach the exact configured production origin.
        if(production) auth.token()?.let { builder.header("Cookie", "CF_Authorization=$it") }
        if(body != null) builder.header("Origin", base).post(body.toString().toRequestBody("application/json; charset=utf-8".toMediaType()))
        return builder.build()
    }
    private fun check(response: Response, sse: Boolean = false) {
        val type = response.header("Content-Type", "")!!
        val disposition=classifyHttp(response.code,type)
        if(disposition == HttpDisposition.AUTH) throw ApiFailure("AUTH_REQUIRED",response.code)
        if(disposition == HttpDisposition.UNAVAILABLE && !type.contains("application/json")) throw ApiFailure("SERVER_UNAVAILABLE",response.code)
        if(!response.isSuccessful) {
            val code = runCatching { JSONObject(response.body?.string() ?: "{}").str("code", "HTTP_ERROR") }.getOrDefault("HTTP_ERROR")
            throw ApiFailure(code,response.code)
        }
        if(disposition != if(sse) HttpDisposition.SSE else HttpDisposition.JSON) throw ApiFailure("INVALID_RESPONSE",response.code)
    }
    private suspend fun Call.await(): Response = suspendCancellableCoroutine { continuation ->
        continuation.invokeOnCancellation { cancel() }
        enqueue(object: Callback {
            override fun onFailure(call: Call, e: IOException) { if(continuation.isActive) continuation.resumeWithException(e) }
            override fun onResponse(call: Call, response: Response) { continuation.resume(response) { _, value, _ -> value.close() } }
        })
    }
    suspend fun jsonGet(path: String): JSONObject = jsonRequest(path,null)
    suspend fun jsonRequest(path: String, body: JSONObject?): JSONObject = withContext(Dispatchers.IO) {
        val json = client.newCall(request(path, body)).awaitDecoded { response ->
            check(response)
            JSONObject(response.body!!.string())
        }
        currentCoroutineContext().ensureActive()
        json
    }
    suspend fun worlds(lang: String): List<World> { val j = jsonGet("/api/worlds?language=$lang"); currentCoroutineContext().ensureActive(); cache.write("worlds-$lang",j); return j.objects("worlds").map(::World) }
    suspend fun shelf(): List<JSONObject> { val j = jsonGet("/api/games"); currentCoroutineContext().ensureActive(); cache.write("shelf",j); return j.objects("games") }
    suspend fun game(id: String): Game { require(id.matches(Regex("[A-Za-z0-9_-]+"))); val j = jsonGet("/api/games/$id"); val game = Game(j.obj("game")); currentCoroutineContext().ensureActive(); cache.write(id,j); return game }
    fun stream(path: String, body: JSONObject): Flow<ServerEvent> = flow {
        val call = client.newCall(request(path, body)); streamCall = call
        try {
            call.await().use { response ->
                check(response,true)
                // HTTP 200 includes completed replay. Only a following stage/text proves live ownership.
                emit(ServerEvent("connected",JSONObject()))
                val queue = ArrayDeque<ServerEvent>()
                val parser = SseParser { event, data -> queue.add(ServerEvent(event, JSONObject(data))) }
                val reader = response.body!!.charStream(); val chars = CharArray(2048)
                var complete = false; var received = false
                while(true) {
                    val count = reader.read(chars)
                    if(count > 0 && !received) { received=true; emit(ServerEvent("receipt",JSONObject())) }
                    if(count == -1) { parser.finish() } else parser.feed(String(chars,0,count))
                    while(queue.isNotEmpty()) { val event = queue.removeFirst(); if(event.type == "complete" || event.type == "error") complete = true; emit(event) }
                    if(count == -1 || complete) break
                }
                if(!complete) throw ApiFailure("STREAM_ENDED")
            }
        } finally { call.cancel(); if(streamCall === call) streamCall = null }
    }.flowOn(Dispatchers.IO)
    fun disconnect() { streamCall?.cancel() }
}
