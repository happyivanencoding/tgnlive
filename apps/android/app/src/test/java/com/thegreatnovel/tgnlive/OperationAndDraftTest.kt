package com.thegreatnovel.tgnlive

import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class OperationAndDraftTest {
    @Test fun lateBookResponseCannotReplaceNewerBook() = runBlocking {
        val gate=OperationGate(); val oldTicket=gate.next(); val release=CompletableDeferred<Unit>(); val applied=mutableListOf<String>()
        val old=launch { release.await(); gate.check(oldTicket); applied.add("old book") }
        val freshTicket=gate.next()
        val fresh=launch { gate.check(freshTicket); applied.add("new book") }
        fresh.join(); release.complete(Unit); old.join()
        assertEquals(listOf("new book"),applied)
        assertTrue(old.isCancelled)
    }
    @Test fun cancelledNonCooperativeIoCannotWriteSnapshot() = runBlocking {
        val gate=OperationGate(); val ticket=gate.next(); val started=CompletableDeferred<Unit>(); val release=CompletableDeferred<Unit>()
        var wrote=false
        val job=launch {
            withContext(NonCancellable) { started.complete(Unit); release.await() }
            gate.check(ticket); wrote=true
        }
        started.await(); job.cancel(); release.complete(Unit); job.join()
        assertFalse(wrote)
    }
    @Test fun completionOnlyClearsExactlyTheSubmittedDraft() {
        assertTrue(shouldClearSubmittedDraft(" action "," action ","action"))
        assertFalse(shouldClearSubmittedDraft("new draft","action","action"))
        assertFalse(shouldClearSubmittedDraft("action\n","action","action"))
        assertFalse(shouldClearSubmittedDraft("edited before retry","edited before retry","original action"))
    }
    @Test fun ordinaryFactsCashAndAttitudesAreNotMajorGrowth() {
        val before=json("realm" to json("name" to "初境","rank" to 0),"coins" to 20)
        val after=JSONObject(before.toString()).put("coins",30).put("facts",JSONArray(listOf("heard news"))).put("relationships",JSONArray().put(json("id" to "npc","attitude" to "友善")))
        assertFalse(hasMajorGrowth(before,after,JSONObject()))
        after.put("capabilities",JSONArray().put(json("id" to "first-skill")))
        assertTrue(hasMajorGrowth(before,after,JSONObject()))
    }
    @Test fun identityGainRequiresExplicitServerChangeMetadata() {
        val before=json("realm" to json("name" to "初境","rank" to 0))
        val after=JSONObject(before.toString()).put("progression",json("leverage" to JSONArray().put(json("id" to "standing","kind" to "identity","status" to "active"))))
        assertFalse(hasMajorGrowth(before,after,JSONObject()))
        assertTrue(hasMajorGrowth(before,after,json("changeKinds" to JSONArray().put(json("field" to "leverage","op" to "add")))))
    }
}
