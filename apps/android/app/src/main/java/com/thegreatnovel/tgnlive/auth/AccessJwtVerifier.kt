package com.thegreatnovel.tgnlive.auth

import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.RSAPublicKeySpec
import java.util.Base64

internal object AccessJwtVerifier {
    private val jwtPattern = Regex("^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$")
    fun untrustedExpiry(token: String): Long = runCatching {
        if (token.length > 16384 || !jwtPattern.matches(token)) return 0
        JSONObject(String(Base64.getUrlDecoder().decode(token.split('.')[1]), Charsets.UTF_8))
            .optLong("exp", 0)
    }.getOrDefault(0)

    fun verify(token: String, jwks: String, nowSeconds: Long = System.currentTimeMillis() / 1000): Long {
        try {
            require(token.length <= 16384 && jwtPattern.matches(token))
            val parts = token.split('.')
            val head = JSONObject(String(Base64.getUrlDecoder().decode(parts[0]), Charsets.UTF_8))
            val claims = JSONObject(String(Base64.getUrlDecoder().decode(parts[1]), Charsets.UTF_8))
            require(head.optString("alg") == "RS256" && !head.has("crit"))
            val kid = head.getString("kid"); require(kid.length in 1..128)
            require(claims.getString("iss") == "https://${AccessConfig.TEAM_DOMAIN}")
            val aud = claims.opt("aud")
            val validAud = if (aud is String) aud == AccessConfig.AUDIENCE else
                claims.optJSONArray("aud")?.let { a -> (0 until a.length()).any { a.optString(it) == AccessConfig.AUDIENCE } } == true
            require(validAud)
            val expires = claims.getLong("exp")
            require(expires > nowSeconds + 15)
            require(!claims.has("nbf") || claims.getLong("nbf") <= nowSeconds + 30)
            require(claims.optString("email").isNotBlank())
            val keys = JSONObject(jwks).getJSONArray("keys")
            val jwk = (0 until keys.length()).map { keys.getJSONObject(it) }
                .firstOrNull { it.optString("kid") == kid && it.optString("kty") == "RSA" }
                ?: throw IllegalArgumentException("Unknown signing key")
            require(!jwk.has("alg") || jwk.getString("alg") == "RS256")
            require(!jwk.has("use") || jwk.getString("use") == "sig")
            val modulus = BigInteger(1, Base64.getUrlDecoder().decode(jwk.getString("n")))
            val exponent = BigInteger(1, Base64.getUrlDecoder().decode(jwk.getString("e")))
            require(modulus.bitLength() >= 2048)
            val key = KeyFactory.getInstance("RSA").generatePublic(RSAPublicKeySpec(modulus, exponent))
            val valid = Signature.getInstance("SHA256withRSA").run {
                initVerify(key); update("${parts[0]}.${parts[1]}".toByteArray(Charsets.US_ASCII))
                verify(Base64.getUrlDecoder().decode(parts[2]))
            }
            require(valid)
            return expires
        } catch (e: Exception) {
            throw NativeAuthException("AUTH_TOKEN_REJECTED", e)
        }
    }
}
