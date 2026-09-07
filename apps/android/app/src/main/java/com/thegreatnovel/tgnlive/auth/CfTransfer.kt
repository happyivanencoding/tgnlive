package com.thegreatnovel.tgnlive.auth

import com.iwebpp.crypto.TweetNaclFast
import okhttp3.HttpUrl.Companion.toHttpUrl
import java.util.Base64
import java.util.concurrent.atomic.AtomicBoolean

/** Public Access application metadata, not credentials. Same owner-only application as Web. */
internal object AccessConfig {
    const val ORIGIN = "https://live.thegreatnovel.com"
    const val TEAM_DOMAIN = "shy-dust-4d38.cloudflareaccess.com"
    const val AUDIENCE = "fc6da00135bf10775ac07acf1efb44ec22a1d3cb9df11a6c022b410533d818c2"
    const val TRANSFER_ORIGIN = "https://login.cloudflareaccess.org"
}

/** The secret key is fresh, memory-only, never supplied by a caller and never persisted. */
class LoginAttempt internal constructor(
    val browserUrl: String,
    internal val publicKey: String,
    internal val secretKey: ByteArray,
    internal val createdNanos: Long,
    internal val epoch: Int,
) {
    internal val consumed = AtomicBoolean(false)
    internal fun destroy() { secretKey.fill(0) }
    override fun toString(): String = "LoginAttempt([redacted])"
}

class NativeAuthException(val code: String, cause: Throwable? = null) :
    Exception(code, cause)

/** Mirrors cloudflare/cloudflared token/{transfer,encrypt}.go; it is not a custom auth bypass. */
internal object CfTransfer {
    fun begin(epoch: Int): LoginAttempt {
        val pair = TweetNaclFast.Box.keyPair()
        // cloudflared uses padded URL-safe base64, including for the transfer capability.
        val publicKey = Base64.getUrlEncoder().encodeToString(pair.publicKey)
        val redirect = AccessConfig.ORIGIN.toHttpUrl().newBuilder()
            .addQueryParameter("token", publicKey)
            .addQueryParameter("aud", AccessConfig.AUDIENCE).build()
        val browser = AccessConfig.ORIGIN.toHttpUrl().newBuilder()
            .encodedPath("/cdn-cgi/access/cli")
            .addQueryParameter("token", publicKey)
            .addQueryParameter("aud", AccessConfig.AUDIENCE)
            .addQueryParameter("redirect_url", redirect.toString())
            .addQueryParameter("send_org_token", "true")
            .addQueryParameter("edge_token_transfer", "true")
            .addQueryParameter("close_interstitial", "true").build()
        return LoginAttempt(browser.toString(), publicKey, pair.secretKey, System.nanoTime(), epoch)
    }

    fun decrypt(bodyBase64: String, servicePublicKey: String, attempt: LoginAttempt): ByteArray {
        if (bodyBase64.length > 65536 || servicePublicKey.length !in 42..48)
            throw NativeAuthException("AUTH_TRANSFER_INVALID")
        return try {
            val envelope = Base64.getDecoder().decode(bodyBase64.trim())
            val peer = Base64.getUrlDecoder().decode(servicePublicKey)
            if (peer.size != 32 || envelope.size < 40) throw NativeAuthException("AUTH_TRANSFER_INVALID")
            val nonce = envelope.copyOfRange(0, 24)
            val boxed = envelope.copyOfRange(24, envelope.size)
            TweetNaclFast.Box(peer, attempt.secretKey).open(boxed, nonce)
                ?: throw NativeAuthException("AUTH_TRANSFER_INVALID")
        } catch (e: NativeAuthException) { throw e }
          catch (e: Exception) { throw NativeAuthException("AUTH_TRANSFER_INVALID", e) }
    }
}
