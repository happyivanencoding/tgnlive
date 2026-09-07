package com.thegreatnovel.tgnlive.auth

import android.content.Context
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Headers
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Browser-owned Cloudflare Access sign-in using Cloudflare's encrypted CLI token transfer.
 * No origin endpoint, exemption, service token, WebView cookie scraping or custom token bridge.
 * Credentials never traverse an Android intent. A fresh NaCl key protects each transfer.
 */
class AccessAuth(context: Context) {
    private val vault = TokenVault(context.applicationContext)
    private val epoch = AtomicInteger(0)
    private val loginLock = Any()
    private val client = OkHttpClient.Builder()
        .followRedirects(false).followSslRedirects(false).retryOnConnectionFailure(false)
        .connectTimeout(15, TimeUnit.SECONDS).readTimeout(65, TimeUnit.SECONDS)
        .callTimeout(75, TimeUnit.SECONDS).build()

    fun token(): String? = vault.token()
    fun beginLogin(): LoginAttempt = synchronized(loginLock) { CfTransfer.begin(epoch.incrementAndGet()) }
    fun logout() = synchronized(loginLock) { epoch.incrementAndGet(); vault.clear() }

    suspend fun finishLogin(attempt: LoginAttempt): Unit = withContext(Dispatchers.IO) {
        if (!attempt.consumed.compareAndSet(false, true)) throw NativeAuthException("AUTH_ATTEMPT_USED")
        try {
            if ((System.nanoTime() - attempt.createdNanos) > TimeUnit.MINUTES.toNanos(10))
                throw NativeAuthException("AUTH_TIMEOUT")
            withTimeout(TimeUnit.MINUTES.toMillis(10)) {
                var appToken: String? = null
                while (appToken == null) {
                    currentCoroutineContext().ensureActive()
                    if (epoch.get() != attempt.epoch) throw NativeAuthException("AUTH_ATTEMPT_REPLACED")
                    val transfer = fetch(Request.Builder()
                        .url("${AccessConfig.TRANSFER_ORIGIN}/transfer/${attempt.publicKey}")
                        .header("User-Agent", "TGNLive-Android/0.8.0").build())
                    when {
                        transfer.code == 200 -> {
                            val plaintext = CfTransfer.decrypt(transfer.body, transfer.headers["service-public-key"] ?: "", attempt)
                            try {
                                // Discard the organization-wide token; this client needs ONLY this application.
                                appToken = JSONObject(String(plaintext, Charsets.UTF_8)).getString("app_token")
                            } finally { plaintext.fill(0) }
                        }
                        transfer.code in listOf(401, 403, 410) -> throw NativeAuthException("AUTH_LOGIN_REJECTED")
                        transfer.code == 429 -> delay(5000)
                        transfer.code >= 500 -> throw NativeAuthException("AUTH_NETWORK_UNAVAILABLE")
                        transfer.code in 300..399 -> throw NativeAuthException("AUTH_TRANSFER_INVALID")
                        else -> delay(1200)
                    }
                }
                val token = appToken ?: throw NativeAuthException("AUTH_TIMEOUT")
                val keys = fetch(Request.Builder().url("https://${AccessConfig.TEAM_DOMAIN}/cdn-cgi/access/certs").build(), 262144)
                if (keys.code != 200) throw NativeAuthException("AUTH_NETWORK_UNAVAILABLE")
                AccessJwtVerifier.verify(token, keys.body)
                currentCoroutineContext().ensureActive()
                // The existing origin also validates owner email/audience/signature: do not substitute for it.
                val probe = fetch(Request.Builder().url("${AccessConfig.ORIGIN}/api/health")
                    .header("Cookie", "CF_Authorization=$token").header("Accept", "application/json")
                    .header("Origin", AccessConfig.ORIGIN).build())
                if (probe.code != 200 || !probe.headers["Content-Type"].orEmpty().contains("application/json"))
                    throw NativeAuthException(if (probe.code >= 500) "AUTH_NETWORK_UNAVAILABLE" else "AUTH_LOGIN_REJECTED")
                val health = JSONObject(probe.body)
                if (!health.optBoolean("ok") || health.optJSONObject("access")?.optString("mode") != "owner-only")
                    throw NativeAuthException("AUTH_LOGIN_REJECTED")
                currentCoroutineContext().ensureActive()
                synchronized(loginLock) {
                    if (epoch.get() != attempt.epoch) throw NativeAuthException("AUTH_ATTEMPT_REPLACED")
                    vault.write(token)
                }
            }
        } catch (e: TimeoutCancellationException) { throw NativeAuthException("AUTH_TIMEOUT") }
          catch (e: CancellationException) { throw e }
          catch (e: NativeAuthException) { throw e }
          catch (e: IOException) { throw NativeAuthException("AUTH_NETWORK_UNAVAILABLE") }
          catch (e: Exception) { throw NativeAuthException("AUTH_TRANSFER_INVALID") }
          finally { attempt.destroy() }
    }

    private data class SmallResponse(val code: Int, val headers: Headers, val body: String)

    /** Consume the bounded response before resuming, so cancellation also cancels body/long-poll IO. */
    private suspend fun fetch(request: Request, limit: Int = 65536): SmallResponse = suspendCancellableCoroutine { continuation ->
        val call = client.newCall(request)
        continuation.invokeOnCancellation { call.cancel() }
        call.enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                if (continuation.isActive) continuation.resumeWithException(e)
            }
            override fun onResponse(call: Call, response: Response) {
                try {
                    val result = response.use {
                        val body = it.body ?: throw IOException("Empty response")
                        if (body.contentLength() > limit) throw IOException("Response too large")
                        val out = ByteArrayOutputStream()
                        body.byteStream().use { input ->
                            val bytes = ByteArray(4096)
                            while (true) {
                                val n = input.read(bytes); if (n == -1) break
                                if (out.size() + n > limit) throw IOException("Response too large")
                                out.write(bytes, 0, n)
                            }
                        }
                        SmallResponse(it.code, it.headers, out.toString("UTF-8"))
                    }
                    if (continuation.isActive) continuation.resume(result)
                } catch (e: Exception) { if (continuation.isActive) continuation.resumeWithException(e) }
            }
        })
    }
}
