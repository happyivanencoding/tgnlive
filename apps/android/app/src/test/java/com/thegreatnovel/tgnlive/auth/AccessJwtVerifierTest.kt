package com.thegreatnovel.tgnlive.auth

import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import java.security.KeyPairGenerator
import java.security.Signature
import java.security.interfaces.RSAPublicKey
import java.util.Base64

/** Synthetic signing keys only; no fixtures ever go to a production request. */
class AccessJwtVerifierTest {
    companion object {
        private const val NOW = 1800000000L
        private val pair = KeyPairGenerator.getInstance("RSA").apply { initialize(2048) }.generateKeyPair()
        private val encoder = Base64.getUrlEncoder().withoutPadding()
        private fun b64(bytes: ByteArray) = encoder.encodeToString(bytes)
        private val jwks: String = (pair.public as RSAPublicKey).let { key ->
            fun unsigned(bytes: ByteArray) = if (bytes[0] == 0.toByte()) bytes.copyOfRange(1, bytes.size) else bytes
            JSONObject().put("keys", JSONArray().put(JSONObject().put("kty", "RSA").put("kid", "synthetic")
                .put("alg", "RS256").put("use", "sig")
                .put("n", b64(unsigned(key.modulus.toByteArray()))).put("e", b64(unsigned(key.publicExponent.toByteArray()))))).toString()
        }
        private fun claims() = JSONObject().put("iss", "https://${AccessConfig.TEAM_DOMAIN}")
            .put("aud", JSONArray().put(AccessConfig.AUDIENCE)).put("email", "reader@example.invalid")
            .put("exp", NOW + 600).put("nbf", NOW - 1)
        private fun token(c: JSONObject = claims(), alg: String = "RS256"): String {
            val unsigned = b64(JSONObject().put("alg", alg).put("kid", "synthetic").toString().toByteArray()) + "." + b64(c.toString().toByteArray())
            val signature = Signature.getInstance("SHA256withRSA").run { initSign(pair.private); update(unsigned.toByteArray()); sign() }
            return "$unsigned.${b64(signature)}"
        }
    }

    @Test fun validSignatureAndApplicationClaimsPass() { assertEquals(NOW + 600, AccessJwtVerifier.verify(token(), jwks, NOW)) }
    @Test fun alternateAudienceCannotAuthenticate() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(claims().put("aud", "other-app")), jwks, NOW) } }
    @Test fun wrongIssuerCannotChooseItsOwnKeyServer() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(claims().put("iss", "https://attacker.cloudflareaccess.com")), jwks, NOW) } }
    @Test fun unsignedAlgorithmIsRejected() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(alg = "none"), jwks, NOW) } }
    @Test fun expiredTokenRejected() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(claims().put("exp", NOW - 1)), jwks, NOW) } }
    @Test fun notYetValidRejected() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(claims().put("nbf", NOW + 300)), jwks, NOW) } }
    @Test fun tamperedSignatureRejected() {
        val parts = token().split('.'); val signature = parts[2]
        val altered = (if (signature[0] == 'A') "B" else "A") + signature.substring(1)
        assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify("${parts[0]}.${parts[1]}.$altered", jwks, NOW) }
    }
    @Test fun missingOrUnknownSigningKeyRejected() { assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(token(), "{\"keys\":[]}", NOW) } }
    @Test fun headerInjectionAndMalformedJwtCannotEnterCookie() {
        for (bad in listOf("", "a.b", "a.b.c\r\nCookie: bad", "x".repeat(16385))) {
            assertEquals(0, AccessJwtVerifier.untrustedExpiry(bad))
            assertThrows(NativeAuthException::class.java) { AccessJwtVerifier.verify(bad, jwks, NOW) }
        }
    }
}
