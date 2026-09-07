package com.thegreatnovel.tgnlive

import kotlinx.coroutines.suspendCancellableCoroutine
import okhttp3.Call
import okhttp3.Callback
import okhttp3.Response
import java.io.IOException
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/** Keep cancellation attached until the body has been consumed, not only until headers arrive. */
internal suspend fun <T> Call.awaitDecoded(decode: (Response) -> T): T = suspendCancellableCoroutine { continuation ->
    val call = this
    continuation.invokeOnCancellation { call.cancel() }
    call.enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            if (continuation.isActive) continuation.resumeWithException(e)
        }
        override fun onResponse(call: Call, response: Response) {
            val result = try {
                response.use { decode(it) }
            } catch (e: Exception) {
                if (continuation.isActive) continuation.resumeWithException(e)
                return
            }
            if (continuation.isActive) continuation.resume(result)
        }
    })
}
