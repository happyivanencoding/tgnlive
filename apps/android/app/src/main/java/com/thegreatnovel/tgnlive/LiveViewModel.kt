package com.thegreatnovel.tgnlive

import android.app.Application
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.thegreatnovel.tgnlive.auth.AccessAuth
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.retryWhen
import org.json.JSONObject
import java.util.UUID

data class ReaderSettings(val language: String = "zh", val theme: String = "system", val font: Int = 2, val haptics: Boolean = true)
data class LiveState(
    val settings: ReaderSettings = ReaderSettings(), val screen: String = "discover", val worlds: List<World> = emptyList(),
    val shelf: List<JSONObject> = emptyList(), val selectedWorld: World? = null, val game: Game? = null,
    val draft: TextFieldValue = TextFieldValue(), val worldPrompt: TextFieldValue = TextFieldValue(),
    val busy: Boolean = false, val loading: Boolean = true, val online: Boolean = false, val authNeeded: Boolean = false,
    val loginWaiting: Boolean = false, val error: String? = null, val pending: Pending? = null,
    val preview: List<Paragraph> = emptyList(), val stage: String = "native.responding", val growth: Boolean = false,
    val follow: Boolean = true, val initialIndex: Int = 0, val initialOffset: Int = 0, val anchorKey: String? = null,
    val sheet: String? = null, val creationUncertain: Boolean = false,
    val narrativeEnded: Boolean = false, val repairing: Boolean = false, val previewCharacters: Int = 0
)

class LiveViewModel(application: Application): AndroidViewModel(application) {
    val auth = AccessAuth(application)
    val cache = SnapshotCache(application)
    val repository = Repository(auth,cache)
    val perf = NativePerf(application)
    private val mutable = MutableStateFlow(LiveState())
    val state = mutable.asStateFlow()
    private var work: Job? = null
    private var loginJob: Job? = null
    private var draftJob: Job? = null
    private var refreshJob: Job? = null
    private var anchorJob: Job? = null
    private var latestAnchor: Pair<String,JSONObject>? = null
    private var stopped = false
    private var accountEpoch = 0
    private val operations=OperationGate()
    private val operationEpoch get()=operations.current
    private var openingGameId: String? = null
    private var initialized = false
    private var worldReceipt: JSONObject? = null
    private fun nextOperation(): Int { work?.cancel(); return operations.next() }
    private suspend fun checkOperation(epoch: Int) = operations.check(epoch)
    private fun flushDraft() {
        val s=state.value; val epoch=accountEpoch
        if(s.screen == "story") s.game?.let { game -> viewModelScope.launch { if(epoch == accountEpoch) saveDraft(game.id,s.draft) } }
        anchorJob?.cancel(); latestAnchor?.let { (id,value) -> viewModelScope.launch(Dispatchers.IO) { if(epoch == accountEpoch) cache.write("anchor-$id",value) } }
    }
    init { viewModelScope.launch {
        val epoch=accountEpoch
        val prefs = withContext(Dispatchers.IO) { cache.preferences() }
        val settings = ReaderSettings(prefs.str("language","zh"),prefs.str("theme","system"),prefs.optInt("font",2).coerceIn(0,4),prefs.optBoolean("haptics",true))
        val saved = withContext(Dispatchers.IO) { Triple(cache.read("worlds-${settings.language}"),cache.read("shelf"),null) }
        worldReceipt = withContext(Dispatchers.IO) { cache.read("world-pending") }
        val creation=withContext(Dispatchers.IO) { cache.read("creation-pending") != null }
        if(epoch != accountEpoch) return@launch
        mutable.update { it.copy(settings=settings,worlds=saved.first?.objects("worlds")?.map(::World) ?: emptyList(),shelf=saved.second?.objects("games") ?: emptyList(),worldPrompt=TextFieldValue(worldReceipt?.str("prompt") ?: ""),creationUncertain=creation) }
        initialized=true
        refresh()
    } }
    fun refresh() {
        refreshJob?.cancel(); val epoch = accountEpoch
        refreshJob = viewModelScope.launch {
            mutable.update { it.copy(loading=true) }
            try {
                val lang = state.value.settings.language
                val worlds = withContext(Dispatchers.IO) { repository.worlds(lang) }
                val shelf = withContext(Dispatchers.IO) { repository.shelf() }
                if(epoch != accountEpoch) return@launch
                mutable.update { it.copy(worlds=worlds,shelf=shelf,online=true,authNeeded=false,error=null,loading=false) }
            } catch(e: CancellationException) { throw e } catch(e: Exception) { currentCoroutineContext().ensureActive(); if(epoch == accountEpoch) { failure(e); mutable.update { it.copy(loading=false) } } }
        }
    }
    fun navigate(screen: String) { if(state.value.busy) return; flushDraft(); nextOperation(); perf.pauseFrames(); openingGameId=null; mutable.update { it.copy(screen=screen,selectedWorld=null,sheet=null,loading=false,error=null) } }
    fun select(world: World) { if(state.value.busy) return; nextOperation(); perf.pauseFrames(); mutable.update { it.copy(selectedWorld=world,screen="preview",error=null) } }
    fun sheet(value: String?) { mutable.update { it.copy(sheet=value) } }
    fun settings(value: ReaderSettings) {
        val languageChanged = value.language != state.value.settings.language
        if(state.value.busy && languageChanged) return
        mutable.update { it.copy(settings=value) }
        viewModelScope.launch(Dispatchers.IO) { cache.preferences(json("language" to value.language,"theme" to value.theme,"font" to value.font,"haptics" to value.haptics)) }
        if(languageChanged) refresh()
    }
    fun draft(value: TextFieldValue) {
        if(value.text.length > 500) return
        mutable.update { it.copy(draft=value) }
        val id = state.value.game?.id ?: return
        val epoch=accountEpoch
        draftJob?.cancel(); draftJob = viewModelScope.launch { delay(180); if(epoch == accountEpoch) saveDraft(id,value) }
    }
    private suspend fun saveDraft(id: String, value: TextFieldValue, ticket: Int=accountEpoch) = withContext(Dispatchers.IO) {
        currentCoroutineContext().ensureActive()
        if(ticket == accountEpoch) cache.write("draft-$id",json("text" to value.text,"start" to value.selection.start,"end" to value.selection.end))
    }
    fun suggest(text: String) = draft(TextFieldValue(text.take(500),TextRange(text.take(500).length)))
    fun prompt(value: TextFieldValue) { if(value.text.length <= 2000) mutable.update { it.copy(worldPrompt=value) } }
    fun open(id: String) {
        if(state.value.busy) return
        flushDraft(); val op=nextOperation(); openingGameId=id; perf.pauseFrames()
        work = viewModelScope.launch {
            mutable.update { it.copy(loading=true,online=false,screen="story",game=null,error=null,growth=false,preview=emptyList()) }
            val saved = withContext(Dispatchers.IO) { listOf(cache.read(id),cache.read("draft-$id"),cache.read("anchor-$id"),cache.read("pending-$id")) }
            val text = saved[1]?.str("text") ?: ""
            val draft = TextFieldValue(text,TextRange((saved[1]?.optInt("start") ?: text.length).coerceIn(0,text.length),(saved[1]?.optInt("end") ?: text.length).coerceIn(0,text.length)))
            val cached = saved[0]?.optJSONObject("game")?.let(::Game)
            val anchor = saved[2]
            checkOperation(op)
            mutable.update { it.copy(game=cached,draft=draft,pending=saved[3]?.let(Pending::read),follow=anchor?.optBoolean("follow",true) ?: true,initialIndex=anchor?.optInt("index") ?: 0,initialOffset=anchor?.optInt("offset") ?: 0,anchorKey=anchor?.str("key")?.takeIf(String::isNotEmpty)) }
            try { val game = withContext(Dispatchers.IO) { repository.game(id) }; checkOperation(op); adopt(game); reconcileReceipt(game) }
            catch(e: CancellationException) { throw e } catch(e: Exception) { checkOperation(op); failure(e) }
            finally { if(op == operationEpoch) mutable.update { it.copy(loading=false) } }
        }
    }
    private fun adopt(game: Game) { mutable.update { it.copy(game=game,online=true,authNeeded=false,error=null) } }
    private suspend fun reconcileReceipt(game: Game): Boolean {
        val p = state.value.pending ?: return false
        if(p.gameId != game.id) return false
        if(recovery(game.version,p) == Recovery.REFRESH_ONLY) {
            withContext(Dispatchers.IO) { cache.delete("pending-${game.id}") }
            mutable.update { it.copy(pending=null,preview=emptyList(),error="turn.restored") }
            return true
        }
        return false
    }
    fun createGame(name: String, power: String, adult: Boolean, opening: String) {
        val s = state.value; val world = s.selectedWorld ?: return
        if(s.busy || s.creationUncertain || !s.online || !adult || name.trim().length !in 1..24) return
        val op=nextOperation()
        mutable.update { it.copy(busy=true,error=null) }
        work = viewModelScope.launch {
            try {
                val body=json("name" to name.trim(),"worldId" to world.id,"powerId" to power,"language" to s.settings.language)
                withContext(Dispatchers.IO) { cache.write("creation-pending",body) }
                mutable.update { it.copy(creationUncertain=true) }
                val result = repository.jsonRequest("/api/games",body)
                checkOperation(op)
                val game = Game(result.obj("game"))
                withContext(Dispatchers.IO) { cache.write(game.id,result); cache.delete("creation-pending") }
                mutable.update { it.copy(game=game,screen="story",selectedWorld=null,busy=false,creationUncertain=false,pending=null,draft=TextFieldValue(opening),follow=true,initialIndex=0,initialOffset=0,anchorKey=null) }
                openingGameId=game.id
                send()
            } catch(e: CancellationException) { throw e } catch(e: Exception) {
                checkOperation(op)
                if(e is ApiFailure && e.status in 400..499) { withContext(Dispatchers.IO) { cache.delete("creation-pending") }; mutable.update { it.copy(creationUncertain=false) } }
                failure(e); mutable.update { it.copy(busy=false) }; refresh()
            } finally { if(op == operationEpoch) mutable.update { it.copy(busy=false) } }
        }
    }
    fun reviewedCreation() { if(!state.value.online || state.value.loading) return; viewModelScope.launch { withContext(Dispatchers.IO) { cache.delete("creation-pending") }; mutable.update { it.copy(creationUncertain=false) } } }
    fun forge() {
        val s = state.value; if(s.busy || !s.online || s.worldPrompt.text.isBlank()) return
        val prompt = s.worldPrompt.text.trim()
        val receipt = worldReceipt?.takeIf { it.str("prompt") == prompt && it.str("language") == s.settings.language }
            ?: json("prompt" to prompt,"language" to s.settings.language,"requestId" to UUID.randomUUID().toString())
        val op=nextOperation()
        worldReceipt=receipt; mutable.update { it.copy(busy=true,error=null,stage="native.responding") }; stopped=false
        work = viewModelScope.launch {
            try {
                withContext(Dispatchers.IO) { cache.write("world-pending",receipt) }
                repository.stream("/api/worlds/custom",receipt).collect { event ->
                    when(event.type) {
                        "stage" -> mutable.update { it.copy(stage=stage(event.data.str("name"))) }
                        "error" -> throw ApiFailure(event.data.str("code"))
                        "complete" -> {
                            val world = World(event.data.obj("world")); require(world.id.isNotEmpty())
                            withContext(Dispatchers.IO) { cache.delete("world-pending") }; worldReceipt=null
                            mutable.update { it.copy(selectedWorld=world,screen="preview",busy=false) }; refresh()
                        }
                    }
                }
            } catch(e: CancellationException) { throw e } catch(e: Exception) { checkOperation(op); if(!stopped) failure(e) }
            finally { if(op == operationEpoch) mutable.update { it.copy(busy=false) } }
        }
    }
    fun send(retry: Boolean = false) {
        val s = state.value; val game = s.game ?: return
        if(s.busy || (!retry && (!s.online || s.draft.text.isBlank() || s.draft.text.length > 500))) return
        if(!retry && s.pending?.gameId == game.id) return
        val prior = s.pending?.takeIf { it.gameId == game.id }
        var p = if(retry && prior != null) prior else Pending(game.id,UUID.randomUUID().toString(),game.version,s.draft.text.trim(),s.settings.language)
        val op=nextOperation()
        stopped=false
        // Synchronous feedback before any disk/network work; native click haptic is at the UI event.
        mutable.update { it.copy(busy=true,error=null,pending=p,preview=emptyList(),previewCharacters=0,narrativeEnded=false,repairing=false,stage="native.responding",growth=false) }
        perf.start(p,game.state.optInt("turnNumber")+1)
        work = viewModelScope.launch {
            var buffer = ""; var displayedBuffer = ""; var terminalFrame = false
            val flush = launch { while(isActive) { delay(40); if(buffer.isNotEmpty() && buffer != displayedBuffer) {
                displayedBuffer=buffer
                mutable.update { it.copy(preview=paragraphs(game.id,game.state.optInt("turnNumber")+1,buffer,p.language),previewCharacters=buffer.length) }
            } } }
            try {
                val current = withContext(Dispatchers.IO) { repository.game(game.id) }; checkOperation(op); adopt(current)
                if(current.version != p.expectedVersion) { reconcileReceipt(current); mutable.update { it.copy(error="native.contextChanged") }; perf.outcome("authority_advanced"); return@launch }
                if(retry && recovery(current.version,p) == Recovery.RETRY_NEW) p = p.copy(requestId=UUID.randomUUID().toString(),action=s.draft.text.trim().ifBlank { p.action },language=s.settings.language,terminal=false)
                if(p.requestId != perf.requestId) perf.rebind(p)
                withContext(Dispatchers.IO) { cache.write("pending-${game.id}",p.stored()); saveDraft(game.id,state.value.draft) }
                mutable.update { it.copy(pending=p) }
                flow { emitAll(repository.stream("/api/games/${game.id}/turns",p.body())) }
                    .retryWhen { cause, attempt ->
                        // Only an explicit retry, and only after the server proves the old receipt terminal.
                        // Network uncertainty / busy / version conflicts never authorize a fresh action.
                        if(retry && attempt == 0L && cause is ApiFailure && cause.code == "REQUEST_ID_REUSED" && cause.status == 409) {
                            p=p.copy(requestId=UUID.randomUUID().toString(),action=s.draft.text.trim().ifBlank { p.action },language=s.settings.language,terminal=false)
                            perf.rebind(p); perf.mark("confirmedTerminalRetry")
                            withContext(Dispatchers.IO) { cache.write("pending-${game.id}",p.stored()) }
                            mutable.update { it.copy(pending=p) }
                            true
                        } else false
                    }.collect { event ->
                    checkOperation(op)
                    if(event.type == "receipt") perf.mark("firstSSE",event.receivedAt)
                    when(event.type) {
                        "stage" -> {
                            val name=event.data.str("name"); val status=event.data.str("status")
                            val end=name=="narrative_complete" || (name=="narrative_generation" && status=="complete")
                            if(name=="narrative_complete") perf.mark("narrativeEndSignal",event.receivedAt)
                            if(name=="narrative_generation" && status=="complete") perf.mark("providerComplete",event.receivedAt)
                            if(name=="repair" && status=="running") perf.mark("repairStarted",event.receivedAt)
                            if(end) {
                                if(!state.value.narrativeEnded && buffer.isNotBlank() && state.value.draft.text == p.action) draft(TextFieldValue(""))
                                displayedBuffer=buffer
                                mutable.update { it.copy(preview=paragraphs(game.id,game.state.optInt("turnNumber")+1,buffer,p.language),previewCharacters=buffer.length) }
                            }
                            mutable.update { it.copy(stage=stage(name),narrativeEnded=it.narrativeEnded || end,repairing=it.repairing || (name=="repair" && status=="running")) }
                        }
                        "narrative_end" -> {
                            if(!state.value.narrativeEnded && buffer.isNotBlank() && state.value.draft.text == p.action) draft(TextFieldValue(""))
                            perf.mark("narrativeEndSignal",event.receivedAt)
                            displayedBuffer=buffer
                            mutable.update { it.copy(narrativeEnded=buffer.isNotBlank(),preview=paragraphs(game.id,game.state.optInt("turnNumber")+1,buffer,p.language),previewCharacters=buffer.length) }
                        }
                        "text" -> { buffer += event.data.str("delta"); perf.textReceived(buffer.length,event.receivedAt) }
                        "error" -> { terminalFrame=true; throw ApiFailure(event.data.str("code")) }
                        "complete" -> {
                            flush.cancel(); perf.mark("complete",event.receivedAt); perf.mark("suggestionsReady",event.receivedAt); perf.outcome("complete")
                            val updated = Game(event.data.obj("game")); require(updated.id == game.id && updated.version > p.expectedVersion && updated.turns.any { it.index == game.state.optInt("turnNumber")+1 })
                            val growth = hasMajorGrowth(game.state,updated.state,event.data.obj("metrics"))
                            draftJob?.cancelAndJoin()
                            checkOperation(op)
                            mutable.update { it.copy(game=updated,preview=emptyList(),pending=null,busy=false,online=true,draft=if(shouldClearSubmittedDraft(it.draft.text,s.draft.text,p.action)) TextFieldValue() else it.draft,growth=growth,error=null) }
                            val retained=state.value.draft
                            withContext(Dispatchers.IO) { cache.write(game.id,json("game" to updated.raw)); cache.delete("pending-${game.id}"); saveDraft(game.id,retained) }
                        }
                    }
                }
            } catch(e: CancellationException) { throw e }
            catch(e: Exception) {
                checkOperation(op)
                if(terminalFrame || (e is ApiFailure && e.code == "REQUEST_ID_REUSED")) {
                    p=p.copy(terminal=true); withContext(Dispatchers.IO) { cache.write("pending-${game.id}",p.stored()) }; mutable.update { it.copy(pending=p) }
                }
                if(!stopped) { failure(e); perf.outcome(if(terminalFrame) "failed" else "unknown") }
            } finally { flush.cancel(); if(op == operationEpoch) mutable.update { it.copy(busy=false,preview=emptyList()) } }
        }
    }
    private fun stage(name: String) = when { name.contains("narrative") -> "native.continuing"; name.contains("plan") || name.contains("parse") || name.contains("persist") || name.contains("valid") || name.contains("repair") -> "native.organizing"; else -> "native.responding" }
    private fun failure(e: Exception) {
        val code = (e as? ApiFailure)?.code
        val label = when(code) { "AUTH_REQUIRED" -> "error.login"; "GAME_BUSY","REQUEST_IN_PROGRESS" -> "native.busy"; "PROVIDER_TIMEOUT","PROVIDER_SETUP_TIMEOUT" -> "error.providerTimeout"; "REQUEST_ID_REUSED","STREAM_ENDED" -> "native.reconcile"; else -> "native.error" }
        val disconnected=e !is ApiFailure || code in setOf("AUTH_REQUIRED","SERVER_UNAVAILABLE","STREAM_ENDED","INVALID_RESPONSE")
        mutable.update { it.copy(error=label,online=if(disconnected) false else it.online,authNeeded=code == "AUTH_REQUIRED") }
    }
    fun stop() {
        stopped=true; repository.disconnect(); nextOperation(); perf.outcome("stopped_reconcile_required")
        mutable.update { it.copy(busy=false,preview=emptyList(),online=false,error="native.reconcile") }
        // Disconnect is sufficient for this backend's response.close abort. Never issue its unscoped cancel POST.
        resume()
    }
    fun background() {
        flushDraft(); perf.pauseFrames()
        if(state.value.busy) { stopped=true; repository.disconnect(); nextOperation(); mutable.update { it.copy(busy=false,online=false,preview=emptyList(),error="native.reconcile") }; perf.outcome("background_disconnected") }
        else nextOperation()
    }
    fun resume() {
        if(!initialized || state.value.busy) return
        if(state.value.screen != "story") { refresh(); return }
        val game = state.value.game ?: run { openingGameId?.let(::open); return }
        val op=nextOperation()
        work = viewModelScope.launch {
            mutable.update { it.copy(loading=true,online=false) }
            try { val latest = withContext(Dispatchers.IO) { repository.game(game.id) }; checkOperation(op); adopt(latest); reconcileReceipt(latest) }
            catch(e: CancellationException) { throw e } catch(e: Exception) { checkOperation(op); failure(e) }
            finally { if(op == operationEpoch) mutable.update { it.copy(loading=false) } }
        }
    }
    fun follow(value: Boolean) { mutable.update { it.copy(follow=value) } }
    fun anchor(index: Int, offset: Int, key: String?) {
        val s = state.value; val id = s.game?.id ?: return
        val epoch=accountEpoch; val value=json("index" to index,"offset" to offset,"key" to key,"follow" to s.follow)
        latestAnchor=id to value
        anchorJob?.cancel(); anchorJob=viewModelScope.launch(Dispatchers.IO) { delay(160); if(epoch == accountEpoch) cache.write("anchor-$id",value) }
    }
    fun login(openBrowser: (String) -> Unit) {
        if(state.value.loginWaiting) return
        mutable.update { it.copy(loginWaiting=true,error=null) }
        loginJob = viewModelScope.launch {
            try { val attempt = withContext(Dispatchers.IO) { auth.beginLogin() }; openBrowser(attempt.browserUrl); withContext(Dispatchers.IO) { auth.finishLogin(attempt); cache.activate() }; mutable.update { it.copy(authNeeded=false,loginWaiting=false) }; refresh(); resume() }
            catch(e: CancellationException) { throw e } catch(e: Exception) { failure(ApiFailure("AUTH_REQUIRED")) }
            finally { mutable.update { it.copy(loginWaiting=false) } }
        }
    }
    fun cancelLogin() { loginJob?.cancel(); mutable.update { it.copy(loginWaiting=false) } }
    fun logout() {
        accountEpoch++; repository.disconnect(); nextOperation(); refreshJob?.cancel(); draftJob?.cancel(); anchorJob?.cancel(); loginJob?.cancel(); perf.pauseFrames(); latestAnchor=null
        viewModelScope.launch {
            work?.join(); refreshJob?.join(); draftJob?.join(); loginJob?.join()
            withContext(Dispatchers.IO) { auth.logout(); cache.purge(); perf.purge() }; worldReceipt=null
            mutable.update { LiveState(settings=it.settings,loading=false,authNeeded=true) }
        }
    }
    override fun onCleared() { repository.disconnect(); perf.close(); super.onCleared() }
}
