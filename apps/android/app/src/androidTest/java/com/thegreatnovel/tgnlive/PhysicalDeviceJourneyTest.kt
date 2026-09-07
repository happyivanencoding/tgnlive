package com.thegreatnovel.tgnlive

import android.app.UiAutomation
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Rect
import android.os.Bundle
import android.os.SystemClock
import android.view.InputDevice
import android.view.MotionEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

/** Real system frame clock + real touch events. No Compose test clock or fixture backend. */
class PhysicalDeviceJourneyTest {
    private val instrumentation get()=InstrumentationRegistry.getInstrumentation()
    private val args get()=InstrumentationRegistry.getArguments()
    private val automation get()=instrumentation.uiAutomation
    private val context get()=instrumentation.targetContext
    private val evidence get()=File(context.getExternalFilesDir(null),"physical-pass").apply { mkdirs() }
    private fun nodes(root: AccessibilityNodeInfo?): List<AccessibilityNodeInfo> {
        if(root == null) return emptyList()
        val found=ArrayList<AccessibilityNodeInfo>()
        fun walk(node: AccessibilityNodeInfo) { found.add(node); repeat(node.childCount) { node.getChild(it)?.let(::walk) } }
        walk(root); return found
    }
    private fun find(tag: String): AccessibilityNodeInfo? {
        if(android.os.Build.VERSION.SDK_INT>=33) automation.clearCache()
        return nodes(automation.rootInActiveWindow).firstOrNull { it.viewIdResourceName==tag && it.isVisibleToUser }
    }
    private fun until(ms: Long=30000, check: ()->Boolean) {
        val deadline=SystemClock.elapsedRealtime()+ms
        while(SystemClock.elapsedRealtime()<deadline) { if(check()) return; SystemClock.sleep(120) }
        throw AssertionError("Physical UI condition timed out after ${ms}ms")
    }
    private fun waitTag(tag: String, ms: Long=30000): AccessibilityNodeInfo { until(ms) { find(tag)!=null }; return find(tag) ?: error("Tag disappeared: $tag") }
    private fun targetIsForeground(): Boolean = automation.windows
        .filter { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION }
        .maxByOrNull { it.layer }?.root?.packageName?.toString()==context.packageName
    private fun requireTargetForeground() { check(targetIsForeground()) { "Device switched away from TGN; no input was injected into another app" } }
    private fun tap(tag: String) {
        waitTag(tag)
        requireTargetForeground()
        until(15000) { find(tag)?.let { it.refresh();it.isEnabled } == true }
        val node=waitTag(tag)
        val rect=Rect(); node.getBoundsInScreen(rect)
        val now=SystemClock.uptimeMillis()
        fun event(action: Int,time: Long)=MotionEvent.obtain(now,time,action,rect.exactCenterX(),rect.exactCenterY(),0).apply { source=InputDevice.SOURCE_TOUCHSCREEN }
        val down=event(MotionEvent.ACTION_DOWN,now)
        check(automation.injectInputEvent(down,true)); down.recycle()
        SystemClock.sleep(65)
        val up=event(MotionEvent.ACTION_UP,SystemClock.uptimeMillis())
        check(automation.injectInputEvent(up,true)); up.recycle()
        SystemClock.sleep(180)
    }
    private fun type(tag: String, text: String) {
        val node=waitTag(tag)
        check(node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT,Bundle().apply { putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE,text) })) { "Native editable semantics did not accept text" }
        SystemClock.sleep(150)
    }
    private fun scrollTo(container: String, predicate: (AccessibilityNodeInfo)->Boolean): AccessibilityNodeInfo {
        repeat(35) {
            nodes(automation.rootInActiveWindow).firstOrNull { it.isVisibleToUser && predicate(it) }?.let { return it }
            val list=waitTag(container)
            check(list.performAction(AccessibilityNodeInfo.ACTION_SCROLL_FORWARD)) { "No further native scroll in $container" }
            SystemClock.sleep(230)
        }
        error("Native control not found in $container")
    }
    private fun scrollTo(container: String, tag: String)=scrollTo(container) { it.viewIdResourceName==tag }
    private fun shot(name: String) {
        SystemClock.sleep(350)
        if(!targetIsForeground()) return // Do not save another app if the owner takes back the phone.
        automation.takeScreenshot()?.let { image ->
            File(evidence,"$name.png").outputStream().use { image.compress(Bitmap.CompressFormat.PNG,100,it) }; image.recycle()
        }
    }
    private fun launchExisting(): String {
        assumeTrue("Explicit device pass only",args.getString("tgnPhysicalPlay")=="yes")
        automation.serviceInfo=automation.serviceInfo.apply { flags=flags or android.accessibilityservice.AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS }
        val id=args.getString("tgnGameId") ?: error("Use an explicitly named Native acceptance save")
        context.startActivity(Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        until { find("discoverScreen")!=null || find("shelfScreen")!=null || find("story")!=null || find("closeSheet")!=null }
        if(find("closeSheet")!=null) tap("closeSheet")
        if(find("story")!=null) tap("leaveStory") else if(find("discoverScreen")!=null) tap("shelf")
        waitTag("shelfScreen");scrollTo("shelfScreen","game-$id");tap("game-$id");waitTag("actionInput")
        return id
    }
    private fun swipe(x1: Float,y1: Float,x2: Float,y2: Float,duration: Long=300) {
        requireTargetForeground()
        val start=SystemClock.uptimeMillis()
        fun inject(action: Int,x: Float,y: Float) {
            val event=MotionEvent.obtain(start,SystemClock.uptimeMillis(),action,x,y,0).apply { source=InputDevice.SOURCE_TOUCHSCREEN }
            check(automation.injectInputEvent(event,true));event.recycle()
        }
        inject(MotionEvent.ACTION_DOWN,x1,y1)
        repeat(15) { i -> SystemClock.sleep(duration/15);val p=(i+1)/15f;inject(MotionEvent.ACTION_MOVE,x1+(x2-x1)*p,y1+(y2-y1)*p) }
        inject(MotionEvent.ACTION_UP,x2,y2);SystemClock.sleep(500)
    }
    private fun backGesture() {
        val d=context.resources.displayMetrics
        swipe(2f,d.heightPixels*.48f,d.widthPixels*.30f,d.heightPixels*.48f)
    }
    private fun command(value: String) {
        android.os.ParcelFileDescriptor.AutoCloseInputStream(automation.executeShellCommand(value)).use { it.readBytes() }
    }
    private fun timing(): JSONObject? = runCatching { File(context.noBackupFilesDir,"native-timing.jsonl").readLines().lastOrNull()?.let(::JSONObject) }.getOrNull()

    @Test fun readingControlsAndLifecycle() {
        val id=launchExisting();val result=JSONObject().put("mode","PHYSICAL_REAL_CLOCK_UI_NO_GENERATION").put("gameId",id)
        val draft="真机草稿：关掉键盘和切回后台后仍然保留。"
        try {
            tap("state");waitTag("stateSpace")
            repeat(6) { index ->
                scrollTo("stateTabs","stateTab-$index");tap("stateTab-$index")
                until { find("stateTab-$index")?.let { it.isSelected || it.isChecked } == true }
                SystemClock.sleep(260)
                shot("controls-state-$index")
            }
            result.put("stateSections",6)
            tap("closeSheet")
            tap("state");waitTag("stateSpace");backGesture();until { find("stateSpace")==null };result.put("nativeSheetBackGesture",true)
            tap("settings");waitTag("theme-dark")
            val previousTheme=nodes(automation.rootInActiveWindow).firstOrNull { (it.isChecked || it.isSelected) && it.viewIdResourceName?.startsWith("theme-")==true }?.viewIdResourceName ?: "theme-system"
            tap("theme-dark");tap("closeSheet");shot("controls-dark")
            tap("settings");tap("theme-light");tap("closeSheet");shot("controls-light")
            tap("settings")
            for(language in listOf("en","fr","es","ar")) { tap("language-$language");SystemClock.sleep(350);shot("controls-language-$language") }
            tap("closeSheet");shot("controls-arabic-reader");tap("state");waitTag("stateSpace");shot("controls-arabic-state");tap("closeSheet")
            tap("settings");tap("language-zh");tap(previousTheme);tap("closeSheet")
            result.put("fiveLanguageUi",true).put("lightDarkUi",true)
            val d=context.resources.displayMetrics
            swipe(d.widthPixels*.5f,d.heightPixels*.35f,d.widthPixels*.5f,d.heightPixels*.73f)
            waitTag("latest");shot("controls-history-anchor");tap("latest");until { find("latest")==null };result.put("historyAndLatest",true)
            type("actionInput",draft);tap("actionInput")
            until { automation.windows.any { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD } }
            val input=Rect().also { waitTag("actionInput").getBoundsInScreen(it) }
            val keyboard=Rect().also { automation.windows.first { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }.getBoundsInScreen(it) }
            check(input.bottom <= keyboard.top+4) { "Keyboard covers the native input: $input vs $keyboard" }
            result.put("keyboardGeometry",JSONObject().put("input",input.flattenToString()).put("keyboard",keyboard.flattenToString()).put("overlap",false))
            shot("controls-keyboard");backGesture()
            until { automation.windows.none { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD } }
            result.put("systemBackClosesIme",true)
            command("input keyevent KEYCODE_HOME");SystemClock.sleep(1000)
            context.startActivity(Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            waitTag("actionInput");until { find("actionInput")?.text?.toString()==draft }
            // Samsung exposes semantics while its launcher return animation is still transforming the window.
            // This pass checks restoration/navigation, not launch latency; do not inject an edge gesture into the launcher animation.
            SystemClock.sleep(900)
            shot("controls-resumed");result.put("backgroundResumeDraft",true)
            if(automation.windows.any { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }) {
                backGesture();until { automation.windows.none { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD } }
            }
            backGesture();waitTag("shelfScreen");shot("controls-bookshelf")
            scrollTo("shelfScreen","game-$id");tap("game-$id");waitTag("actionInput")
            until { find("actionInput")?.text?.toString()==draft };result.put("bookReturnDraft",true).put("pass",true)
        } catch(e: Throwable) { result.put("pass",false).put("error",e.message);shot("controls-failure");throw e }
        finally { File(evidence,"controls-result.json").writeText(result.toString(2)) }
    }

    /** Read the existing Activity's real ViewModel for a composition assertion; never create or mutate game state. */
    private fun actualState(): LiveState {
        var result: LiveState?=null
        instrumentation.runOnMainSync {
            val activity=androidx.test.runner.lifecycle.ActivityLifecycleMonitorRegistry.getInstance()
                .getActivitiesInStage(androidx.test.runner.lifecycle.Stage.RESUMED).filterIsInstance<MainActivity>().single()
            result=androidx.lifecycle.ViewModelProvider(activity)[LiveViewModel::class.java].state.value
        }
        return checkNotNull(result)
    }
    @Test fun draftCompositionSurvivesConfirmation() {
        val id=launchExisting();val result=JSONObject().put("mode","PHYSICAL_AUTOMATIC_DRAFT_ACROSS_REAL_COMMIT").put("gameId",id)
        try {
            type("actionInput","我按刚得到的线索亲自行动，把眼前的机会变成能够保留下来的能力或收获。")
            tap(if(find("retryAction")!=null) "retryAction" else "sendAction");waitTag("stopAction")
            until(120000) { actualState().let { it.busy && it.narrativeEnded } }
            waitTag("actionInput",5000)
            check(find("sendAction")==null) { "New action must not be sent before Canon commit" }
            check(actualState().draft.text.isEmpty()) { "Old submitted action leaked into the new draft" }
            type("actionInput","下一步草稿：");tap("actionInput")
            until(5000) { automation.windows.any { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD } }
            // Gboard nine-key keeps its unfinished pinyin in the IME candidate window, not
            // necessarily TextFieldValue.composition. Assert the real candidate survives instead.
            fun candidate(): AccessibilityNodeInfo? {
                automation.clearCache()
                val window=automation.windows.firstOrNull { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }
                return nodes(window?.root).firstOrNull { it.text?.toString()=="你好" || it.contentDescription?.toString()=="你好" }
            }
            fun touch(x: Float,y: Float) {
                requireTargetForeground();val at=SystemClock.uptimeMillis()
                for(action in listOf(MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP)) {
                    val event=MotionEvent.obtain(at,SystemClock.uptimeMillis(),action,x,y,0).apply { source=InputDevice.SOURCE_TOUCHSCREEN }
                    check(automation.injectInputEvent(event,true));event.recycle();SystemClock.sleep(70)
                }
            }
            SystemClock.sleep(300)
            touch(1030f,2410f);touch(385f,2410f);touch(385f,2410f);touch(712f,2200f);touch(1030f,2410f)
            until(3000) { candidate()!=null }
            val before=actualState();check(before.busy) { "Commit won before composition; this run cannot prove cross-commit composition" }
            result.put("imeCandidateBefore","你好").put("draftBefore",before.draft.text)
            shot("draft-pending-composition")
            until(180000) { actualState().let { !it.busy && it.pending==null } }
            val after=actualState()
            check(after.draft.text==before.draft.text) { "Confirm transition changed the draft" }
            val choice=checkNotNull(candidate()) { "Commit transition discarded the actual unfinished Gboard candidate" }
            check(find("sendAction")?.isEnabled==true)
            val bounds=Rect();choice.getBoundsInScreen(bounds);touch(bounds.exactCenterX(),bounds.exactCenterY())
            until { actualState().draft.text.contains("你好") }
            result.put("imeCandidateAfter","你好").put("committedText",actualState().draft.text).put("preserved",true).put("committedTurn",after.game?.version).put("pass",true)
            shot("draft-after-confirmation")
            type("actionInput","");backGesture()
            tap("state");waitTag("stateSpace");shot("final-state-grid");tap("closeSheet")
        } catch(e: Throwable) { result.put("pass",false).put("error",e.message);shot("draft-failure");throw e }
        finally { File(evidence,"draft-result.json").writeText(result.toString(2)) }
    }

    @Test fun resumeAndBackGestureOnly() {
        val id=launchExisting();val draft="真机恢复：这份草稿应留在同一本书里。"
        val result=JSONObject().put("mode","PHYSICAL_RESUME_AND_BACK_ONLY").put("gameId",id)
        try {
            type("actionInput",draft)
            command("input keyevent KEYCODE_HOME");SystemClock.sleep(700)
            context.startActivity(Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
            waitTag("actionInput");SystemClock.sleep(1000)
            until { find("actionInput")?.text?.toString()==draft };shot("resume-stable")
            if(automation.windows.any { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }) { backGesture();SystemClock.sleep(400) }
            backGesture();waitTag("shelfScreen");shot("resume-back-bookshelf")
            scrollTo("shelfScreen","game-$id");tap("game-$id");waitTag("actionInput")
            until { find("actionInput")?.text?.toString()==draft }
            result.put("backgroundResumeDraft",true).put("systemBackToBookshelf",true).put("returnToSameBookDraft",true).put("pass",true)
        } catch(e: Throwable) { result.put("pass",false).put("error",e.message);shot("resume-failure");throw e }
        finally { File(evidence,"resume-result.json").writeText(result.toString(2)) }
    }

    @Test fun chineseNineKeyComposition() {
        val id=launchExisting()
        assumeTrue("This physical key geometry was observed on this phone, not a generic keyboard fixture", android.os.Build.MODEL=="SM-S928U1" && context.resources.displayMetrics.widthPixels==1440)
        val original=waitTag("actionInput").text?.toString().orEmpty()
        val result=JSONObject().put("mode","PHYSICAL_GBOARD_NINEKEY_COMPOSITION").put("gameId",id)
        fun touchAt(x: Float,y: Float) {
            requireTargetForeground()
            val downTime=SystemClock.uptimeMillis()
            for(action in listOf(MotionEvent.ACTION_DOWN,MotionEvent.ACTION_UP)) {
                val event=MotionEvent.obtain(downTime,SystemClock.uptimeMillis(),action,x,y,0).apply { source=InputDevice.SOURCE_TOUCHSCREEN }
                check(automation.injectInputEvent(event,true));event.recycle();SystemClock.sleep(70)
            }
        }
        try {
            type("actionInput","真机拼音：");tap("actionInput")
            until { automation.windows.any { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD } }
            // Actual configured Gboard nine-key: mno(6), ghi(4), ghi(4), abc(2), mno(6) -> nihao.
            // These are physical key touches, not adb input text or ACTION_SET_TEXT for the Chinese result.
            SystemClock.sleep(400)
            touchAt(1030f,2410f);touchAt(385f,2410f);touchAt(385f,2410f);touchAt(712f,2200f);touchAt(1030f,2410f)
            SystemClock.sleep(400);shot("ime-ninekey-composing")
            val keyboard=automation.windows.first { it.type==android.view.accessibility.AccessibilityWindowInfo.TYPE_INPUT_METHOD }
            val candidate=nodes(keyboard.root).firstOrNull { it.text?.toString()=="你好" || it.contentDescription?.toString()=="你好" }
                ?: error("Expected real Gboard candidate not exposed; inspect physical screenshot rather than fake a commit")
            val rect=Rect();candidate.getBoundsInScreen(rect);touchAt(rect.exactCenterX(),rect.exactCenterY())
            until { find("actionInput")?.text?.toString()?.contains("你好")==true }
            shot("ime-ninekey-committed");result.put("committedText",waitTag("actionInput").text?.toString()).put("pass",true)
        } catch(e: Throwable) { result.put("pass",false).put("error",e.message);shot("ime-ninekey-failure");throw e }
        finally { type("actionInput",original);backGesture();File(evidence,"ime-result.json").writeText(result.toString(2)) }
    }

    @Test fun explicitStopAndRetry() {
        val id=launchExisting();val result=JSONObject().put("mode","PHYSICAL_REAL_CLOCK_CANCEL_RETRY").put("gameId",id)
        try {
            type("actionInput","我把已经掌握的本事用在眼前的机会里，争取下一份真正属于自己的收获。")
            val at=SystemClock.elapsedRealtime();tap("sendAction");waitTag("stopAction")
            until(25000) { timing()?.let { it.optLong("tap")>=at && it.optLong("firstSSE")>0 } == true }
            val before=timing()!!;check(before.optString("outcome")!="complete") { "Turn finished before cancellation; do not fabricate a Stop test" }
            shot("stop-in-flight");tap("stopAction");waitTag("retryAction");shot("stop-cancelled")
            result.put("cancelledRequestId",before.optString("requestId")).put("targetTurn",before.optInt("turn"))
            tap("retryAction");waitTag("stopAction")
            until(180000) { find("stopAction")==null && (find("sendAction")!=null || find("retryAction")!=null) }
            check(find("retryAction")==null) { "Explicit retry did not finish" }
            val after=timing()!!;check(after.optString("outcome")=="complete")
            check(after.optInt("turn")==before.optInt("turn")) { "Cancellation/retry duplicated a turn" }
            check(after.optString("requestId")!=before.optString("requestId"))
            shot("stop-retry-complete");result.put("committedRequestId",after.optString("requestId")).put("pass",true)
        } catch(e: Throwable) { result.put("pass",false).put("error",e.message);shot("stop-failure");throw e }
        finally { File(evidence,"stop-result.json").writeText(result.toString(2)) }
    }

    @Test fun realDeviceRealClockJourney() {
        assumeTrue("Explicit physical play only",args.getString("tgnPhysicalPlay")=="yes")
        automation.serviceInfo = automation.serviceInfo.apply { flags = flags or android.accessibilityservice.AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or android.accessibilityservice.AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS }
        val run=args.getString("tgnRun") ?: "device"
        val rounds=(args.getString("tgnRounds")?.toIntOrNull() ?: 2).coerceIn(1,6)
        val existing=args.getString("tgnGameId")
        val steps=JSONArray()
        context.startActivity(Intent(context,MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        try {
            waitTag("discoverScreen")
            until { find("world-cinder-river")!=null || find("login")!=null }
            check(find("login")==null) { "Existing lawful production login needed; never inject credentials" }
            if(existing != null) {
                tap("shelf"); scrollTo("shelfScreen","game-$existing");tap("game-$existing");waitTag("actionInput")
                if(args.getString("tgnResumeRetry")=="yes" && find("retryAction")!=null) {
                    tap("retryAction"); waitTag("stopAction",10000)
                    until(180000) { find("stopAction")==null && (find("sendAction")!=null || find("retryAction")!=null) }
                    check(find("retryAction")==null) { "Explicit restart recovery failed" }
                    steps.put(JSONObject().put("phase","explicit_restart_retry").put("observedReady",SystemClock.elapsedRealtime()))
                    shot("$run-recovered")
                }
            } else {
                scrollTo("discoverScreen","world-cinder-river");tap("world-cinder-river")
                val power=scrollTo("worldPreview") { it.viewIdResourceName?.startsWith("power-")==true }.viewIdResourceName
                tap(power);scrollTo("worldPreview","heroName");type("heroName","Native $run".take(24))
                scrollTo("worldPreview","adultConsent");tap("adultConsent")
                scrollTo("worldPreview","enterWorld");tap("enterWorld")
                waitTag("story");until(180000) { find("stopAction")==null && (find("sendAction")!=null || find("retryAction")!=null) }
                check(find("retryAction")==null) { "Real opening failed; no fabricated continuation" }
                shot("$run-opening")
            }
            repeat(rounds) { index ->
                waitTag("actionInput")
                if(index==0) type("actionInput","我先确认眼前的人和地方，明确自己已掌握的能力，再选一件现在就能推进、能让我真正变强的事，亲自行动。")
                else {
                    val choice=nodes(automation.rootInActiveWindow).firstOrNull { it.isVisibleToUser && it.viewIdResourceName?.startsWith("suggestion-")==true } ?: error("No visible real suggestions")
                    tap(choice.viewIdResourceName)
                }
                val tapAt=SystemClock.elapsedRealtime();tap("sendAction")
                waitTag("stopAction",10000);shot("$run-${index+1}-pending")
                until(180000) { find("stopAction")==null && (find("sendAction")!=null || find("retryAction")!=null) }
                check(find("retryAction")==null) { "Real turn failed; failure preserved" }
                waitTag("actionInput");shot("$run-${index+1}-ready")
                steps.put(JSONObject().put("round",index+1).put("touchStart",tapAt).put("observedReady",SystemClock.elapsedRealtime()))
                if(index==0) { tap("state");shot("$run-state");tap("closeSheet") }
            }
            File(evidence,"$run-result.json").writeText(JSONObject().put("mode","PHYSICAL_REAL_CLOCK_PRODUCTION_TOUCH").put("pass",true).put("steps",steps).toString(2))
        } catch(error: Throwable) {
            shot("$run-failure")
            File(evidence,"$run-result.json").writeText(JSONObject().put("mode","PHYSICAL_REAL_CLOCK_PRODUCTION_TOUCH").put("pass",false).put("steps",steps).put("error",error.message).toString(2))
            throw error
        }
    }
}
