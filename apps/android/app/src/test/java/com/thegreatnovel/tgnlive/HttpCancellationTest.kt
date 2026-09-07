package com.thegreatnovel.tgnlive

import kotlinx.coroutines.*
import okhttp3.OkHttpClient
import okhttp3.Request
import org.junit.Assert.*
import org.junit.Test
import java.io.Closeable
import java.net.InetAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/** JVM transport regression only. Synthetic localhost HTTP is NOT live TGN or Android UI evidence. */
class HttpCancellationTest {
    private class LocalReply(private val reply: (Socket) -> Unit) : Closeable {
        private val listener = ServerSocket(0, 1, InetAddress.getByName("127.0.0.1"))
        @Volatile private var accepted: Socket? = null
        private val worker = Executors.newSingleThreadExecutor { task -> Thread(task, "http-regression").apply { isDaemon = true } }
        val url = "http://127.0.0.1:${listener.localPort}/test"
        init {
            worker.submit {
                listener.accept().use { socket ->
                    accepted = socket
                    socket.soTimeout = 5000
                    val reader = socket.getInputStream().bufferedReader(Charsets.US_ASCII)
                    while (true) { val line = reader.readLine() ?: break; if (line.isEmpty()) break }
                    reply(socket)
                }
            }
        }
        override fun close() { listener.close(); accepted?.close(); worker.shutdownNow(); worker.awaitTermination(2, TimeUnit.SECONDS) }
    }
    private fun client() = OkHttpClient.Builder().readTimeout(30, TimeUnit.SECONDS).retryOnConnectionFailure(false).build()
    private fun OkHttpClient.dispose() { dispatcher.executorService.shutdownNow(); connectionPool.evictAll() }

    @Test(timeout = 15000) fun cancelAfterHeadersClosesStalledBodyWithoutWaitingForReadTimeout() = runBlocking {
        val decodedHeaders = CountDownLatch(1)
        val peerClosed = CountDownLatch(1)
        LocalReply { socket ->
            socket.getOutputStream().apply {
                write("HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: 100000\r\nConnection: close\r\n\r\n".toByteArray())
                flush()
            }
            try { if (socket.getInputStream().read() == -1) peerClosed.countDown() }
            catch (_: Exception) { peerClosed.countDown() }
        }.use { server ->
            val client = client()
            try {
                val call = client.newCall(Request.Builder().url(server.url).build())
                val job = launch { call.awaitDecoded { response -> decodedHeaders.countDown(); response.body!!.string() } }
                assertTrue(withContext(Dispatchers.IO) { decodedHeaders.await(5, TimeUnit.SECONDS) })
                withTimeout(2000) { job.cancelAndJoin() }
                assertTrue(call.isCanceled())
                assertTrue(withContext(Dispatchers.IO) { peerClosed.await(2, TimeUnit.SECONDS) })
            } finally { client.dispose() }
        }
    }

    @Test(timeout = 15000) fun fullUtf8BodyIsDecodedBeforeResultCompletes() = runBlocking {
        val text = "{\"message\":\"世界 · العربية\"}"
        val bytes = text.toByteArray(Charsets.UTF_8)
        LocalReply { socket ->
            socket.getOutputStream().apply {
                write("HTTP/1.1 200 OK\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: ${bytes.size}\r\nConnection: close\r\n\r\n".toByteArray())
                write(bytes); flush()
            }
        }.use { server ->
            val client = client()
            try { assertEquals(text, client.newCall(Request.Builder().url(server.url).build()).awaitDecoded { it.body!!.string() }) }
            finally { client.dispose() }
        }
    }
}
