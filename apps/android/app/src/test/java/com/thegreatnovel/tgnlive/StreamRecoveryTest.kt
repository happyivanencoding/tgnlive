package com.thegreatnovel.tgnlive

import org.junit.Assert.*
import org.junit.Test
import java.io.ByteArrayInputStream
import java.io.InputStreamReader

class StreamRecoveryTest {
    @Test fun everyCharacterBoundaryHandlesCrLfMultilineHeartbeatsAndEof() {
        val input=": heartbeat\r\nevent: text\r\ndata: first\r\ndata: 第二段\r\n\r\nevent: complete\ndata: {\"done\":true}"
        for(split in 0..input.length) {
            val events=mutableListOf<Pair<String,String>>()
            val parser=SseParser { name,data -> events.add(name to data) }
            parser.feed(input.substring(0,split)); parser.feed(input.substring(split)); parser.finish()
            assertEquals(listOf("text" to "first\n第二段"),events)
        }
    }
    @Test fun fragmentedUtf8RetainsArabicChineseAndSupplementaryCharacters() {
        val expected="正文 العربية 🐉"; val bytes="event: text\ndata: $expected\n\n".toByteArray(Charsets.UTF_8)
        val stream=object: ByteArrayInputStream(bytes) { override fun read(b: ByteArray,off: Int,len: Int)=super.read(b,off,minOf(1,len)) }
        val events=mutableListOf<String>(); val parser=SseParser { _,data -> events.add(data) }
        InputStreamReader(stream,Charsets.UTF_8).use { reader -> val chars=CharArray(1); while(reader.read(chars) != -1) parser.feed(String(chars)) }
        parser.finish(); assertEquals(listOf(expected),events)
    }
    @Test fun completeReplayNeedsNoNarrativeEvent() {
        val events=mutableListOf<String>(); val parser=SseParser { event,_ -> events.add(event) }
        parser.feed("event: complete\ndata: {}\n\n"); parser.finish(); assertEquals(listOf("complete"),events)
    }
    @Test fun eofWithoutBlankLineNeverCommitsEvenIfJsonIsComplete() {
        listOf("event: complete\ndata: {}", "event: complete\ndata: {}\n", "event: complete\r\ndata: {}\r\n").forEach { wire ->
            val events=mutableListOf<String>(); val parser=SseParser { event,_ -> events.add(event) }
            parser.feed(wire); parser.finish(); assertTrue(events.isEmpty())
        }
    }
    @Test fun edgeOutageHtmlIsNotAnExpiredLogin() {
        assertEquals(HttpDisposition.UNAVAILABLE,classifyHttp(502,"text/html"))
        assertEquals(HttpDisposition.UNAVAILABLE,classifyHttp(503,"text/html"))
        assertEquals(HttpDisposition.AUTH,classifyHttp(302,"text/html"))
        assertEquals(HttpDisposition.AUTH,classifyHttp(401,"application/json"))
        assertEquals(HttpDisposition.AUTH,classifyHttp(200,"text/html"))
        assertEquals(HttpDisposition.ERROR,classifyHttp(409,"application/json"))
        assertEquals(HttpDisposition.JSON,classifyHttp(200,"application/json; charset=utf-8"))
        assertEquals(HttpDisposition.SSE,classifyHttp(200,"text/event-stream; charset=utf-8"))
    }
    @Test fun tinyLandscapeImeKeepsNativeInputAndActionInOneRow() {
        val small=readerLayoutPolicy(150f,true,1f)
        assertTrue(small.hideHeader); assertTrue(small.hideToolbar); assertTrue(small.inlineAction)
        assertEquals(1,small.maxInputLines); assertFalse(small.showSuggestions)
        val largeFont=readerLayoutPolicy(240f,true,2f)
        assertTrue(largeFont.inlineAction); assertEquals(1,largeFont.maxInputLines)
        val portrait=readerLayoutPolicy(780f,false,1f)
        assertFalse(portrait.hideHeader); assertFalse(portrait.inlineAction); assertTrue(portrait.showSuggestions)
        assertEquals(4,portrait.maxInputLines)
    }
    @Test fun recoveryNeverRepostsWhenAuthorityChanged() {
        val p=Pending("game_x","request_123",5,"action","ar")
        assertEquals(Recovery.REFRESH_ONLY,recovery(6,p))
        assertEquals(Recovery.REFRESH_ONLY,recovery(4,p))
        assertEquals(Recovery.RETRY_SAME,recovery(5,p))
        assertEquals(Recovery.RETRY_NEW,recovery(5,p.copy(terminal=true)))
        assertEquals(Recovery.REFRESH_ONLY,recovery(6,p.copy(terminal=true)))
    }
    @Test fun provisionalKeysSurviveAppendAndCanonicalCompletion() {
        val first=paragraphs("g",8,"第一段\n\n第二","zh")
        val complete=paragraphs("g",8,"第一段\n\n第二段完成\n\n第三段","zh")
        assertEquals(first.map { it.key },complete.take(2).map { it.key })
        assertNotEquals(paragraphs("g",7,"第一段","zh")[0].key,first[0].key)
        assertNotEquals(paragraphs("other",8,"第一段","zh")[0].key,first[0].key)
        assertEquals("ar",paragraphs("g",9,"نص جديد","ar")[0].language)
        assertEquals("zh",first[0].language)
    }
    @Test fun receiptRoundTripPreservesRequestIdentityAndLanguage() {
        val pending=Pending("game_x","request_xyz",8,"保留\n草稿 العربية","ar",true)
        assertEquals(pending,Pending.read(pending.stored()))
    }
}
