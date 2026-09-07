package com.thegreatnovel.tgnlive

import android.content.Context
import android.os.SystemClock
import android.util.AtomicFile
import android.util.Log
import kotlinx.coroutines.*
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.channels.Channel
import org.json.JSONObject
import java.io.File
import java.util.UUID

/** Frame callbacks stamp/enqueue only. Bounded IO consumer writes identifiers/times, never prose. */
class NativePerf(context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir,"native-timing.jsonl"))
    private val ioLock=Any()
    private val writer=CoroutineScope(SupervisorJob()+Dispatchers.IO)
    private val queue=Channel<Pair<Int,String>>(64,BufferOverflow.DROP_OLDEST)
    private val history=linkedMapOf<String,String>()
    @Volatile private var epoch=0
    @Volatile private var exported=""
    private var record: JSONObject? = null
    var turn: Int = -1; private set
    var interactionId: String? = null; private set
    var requestId: String? = null; private set
    var gameId: String? = null; private set
    var acceptsFrames=false; private set
    init {
        writer.launch {
            synchronized(ioLock) {
                runCatching { file.openRead().bufferedReader().useLines { lines -> lines.take(24).forEach { line -> runCatching { JSONObject(line).let { history[it.str("interactionId")]=line } } } } }
                exported=history.values.joinToString("\n")
            }
            for((ticket,snapshot) in queue) synchronized(ioLock) {
                if(ticket == epoch) {
                    history[JSONObject(snapshot).str("interactionId")]=snapshot
                    while(history.size > 24) history.remove(history.keys.first())
                    exported=history.values.joinToString("\n")
                    runCatching {
                        val stream=file.startWrite()
                        try { stream.write(exported.toByteArray(Charsets.UTF_8)); file.finishWrite(stream) }
                        catch(e: Exception) { file.failWrite(stream); throw e }
                    }
                    if(BuildConfig.DEBUG) Log.i("TGNNativePerf",snapshot)
                }
            }
        }
    }
    @Synchronized fun start(p: Pending, index: Int) {
        interactionId = UUID.randomUUID().toString()
        requestId = p.requestId; gameId=p.gameId; turn = index; acceptsFrames=true
        record = json("interactionId" to interactionId,"kind" to "turn","requestId" to p.requestId,"gameId" to p.gameId,"turn" to index,"tap" to SystemClock.elapsedRealtime(),"feedbackFrame" to null,"firstSSE" to null,"firstVisibleNarrativeFrame" to null,"complete" to null,"choicesReady" to null)
        persist()
    }
    @Synchronized fun rebind(p: Pending) { requestId=p.requestId; record?.put("requestId",p.requestId); persist() }
    @Synchronized fun mark(name: String, at: Long=SystemClock.elapsedRealtime()): Boolean {
        val r = record ?: return false
        if(!r.isNull(name)) return false
        if((name.endsWith("Frame") || name == "choicesReady") && !acceptsFrames) return false
        r.put(name,at); persist(); return true
    }
    @Synchronized fun outcome(value: String) { record?.put("outcome",value); if(value != "complete") acceptsFrames=false; persist() }
    @Synchronized fun pauseFrames() { acceptsFrames=false }
    @Synchronized private fun persist() {
        val r = record ?: return
        queue.trySend(epoch to r.toString())
    }
    fun export(): String = exported
    fun purge() {
        synchronized(this) { record=null; interactionId=null; requestId=null; gameId=null; turn=-1; acceptsFrames=false; epoch++ }
        synchronized(ioLock) { history.clear(); exported=""; file.delete() }
    }
    fun close() { writer.cancel(); queue.close() }
}
