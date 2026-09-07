package com.thegreatnovel.tgnlive.auth

import com.iwebpp.crypto.TweetNaclFast
import okhttp3.HttpUrl.Companion.toHttpUrl
import org.junit.Assert.*
import org.junit.Test
import java.security.SecureRandom
import java.util.Base64

class CfTransferTest {
    @Test fun freshEphemeralCapabilityAndExactCloudflareTarget() {
        val first = CfTransfer.begin(1); val second = CfTransfer.begin(2)
        try {
            assertNotEquals(first.publicKey, second.publicKey)
            assertFalse(first.secretKey.contentEquals(second.secretKey))
            val url = first.browserUrl.toHttpUrl()
            assertEquals("https", url.scheme)
            assertEquals("live.thegreatnovel.com", url.host)
            assertEquals("/cdn-cgi/access/cli", url.encodedPath)
            assertEquals(AccessConfig.AUDIENCE, url.queryParameter("aud"))
            assertEquals(first.publicKey, url.queryParameter("token"))
            assertEquals("true", url.queryParameter("edge_token_transfer"))
            assertEquals(32, Base64.getUrlDecoder().decode(first.publicKey).size)
            assertEquals("live.thegreatnovel.com", url.queryParameter("redirect_url")!!.toHttpUrl().host)
            assertFalse(first.toString().contains(first.publicKey))
        } finally { first.destroy(); second.destroy() }
        assertTrue(first.secretKey.all { it == 0.toByte() })
    }

    @Test fun noncePrefixedNaClBoxRoundTripMatchesCloudflaredWireFormat() {
        val attempt = CfTransfer.begin(1)
        val peer = TweetNaclFast.Box.keyPair()
        val nonce = ByteArray(24).also { SecureRandom().nextBytes(it) }
        val message = "{\"app_token\":\"TEST_ONLY\",\"org_token\":\"DISCARD\"}".toByteArray()
        val sealed = TweetNaclFast.Box(Base64.getUrlDecoder().decode(attempt.publicKey), peer.secretKey).box(message, nonce)
        try {
            assertArrayEquals(message, CfTransfer.decrypt(Base64.getEncoder().encodeToString(nonce + sealed),
                Base64.getUrlEncoder().encodeToString(peer.publicKey), attempt))
        } finally { attempt.destroy(); peer.secretKey.fill(0) }
    }

    @Test fun tamperedEnvelopeDoesNotDecrypt() {
        val attempt = CfTransfer.begin(1); val peer = TweetNaclFast.Box.keyPair()
        val nonce = ByteArray(24).also { SecureRandom().nextBytes(it) }
        val sealed = TweetNaclFast.Box(Base64.getUrlDecoder().decode(attempt.publicKey), peer.secretKey).box("synthetic".toByteArray(), nonce)
        sealed[0] = (sealed[0].toInt() xor 1).toByte()
        try {
            assertThrows(NativeAuthException::class.java) {
                CfTransfer.decrypt(Base64.getEncoder().encodeToString(nonce + sealed), Base64.getUrlEncoder().encodeToString(peer.publicKey), attempt)
            }
        } finally { attempt.destroy(); peer.secretKey.fill(0) }
    }

    @Test fun malformedOrOversizedTransferIsRejected() {
        val attempt = CfTransfer.begin(1)
        try {
            for (body in listOf("", "not base64!", "a".repeat(65537))) {
                assertThrows(NativeAuthException::class.java) { CfTransfer.decrypt(body, "a".repeat(44), attempt) }
            }
        } finally { attempt.destroy() }
    }
}
