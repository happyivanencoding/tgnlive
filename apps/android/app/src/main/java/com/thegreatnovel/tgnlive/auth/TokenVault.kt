package com.thegreatnovel.tgnlive.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only an encrypted application JWT is persisted; Android backup and token logging are forbidden. */
internal class TokenVault(context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "tgn-access-session.enc"))
    private val alias = "tgn-live-access-v1"
    private val aad = "tgn-live-access-v1|${AccessConfig.ORIGIN}".toByteArray(Charsets.UTF_8)
    private val lock = Any()
    private var cached: String? = null
    private var loaded = false

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").run {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).setRandomizedEncryptionRequired(true).build())
            generateKey()
        }
    }

    fun token(): String? = synchronized(lock) {
        if (!loaded) {
            cached = runCatching {
                val raw = file.readFully(); require(raw.size < 65536)
                val data = JSONObject(String(raw, Charsets.UTF_8))
                require(data.getInt("version") == 1)
                val iv = Base64.getDecoder().decode(data.getString("iv")); require(iv.size == 12)
                val cipher = Cipher.getInstance("AES/GCM/NoPadding")
                cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv)); cipher.updateAAD(aad)
                String(cipher.doFinal(Base64.getDecoder().decode(data.getString("data"))), Charsets.UTF_8)
            }.getOrNull()
            loaded = true
        }
        cached?.takeIf { AccessJwtVerifier.untrustedExpiry(it) > System.currentTimeMillis() / 1000 + 15 }
    }

    fun write(token: String) = synchronized(lock) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key()); cipher.updateAAD(aad)
        val encoded = JSONObject().put("version", 1)
            .put("iv", Base64.getEncoder().encodeToString(cipher.iv))
            .put("data", Base64.getEncoder().encodeToString(cipher.doFinal(token.toByteArray(Charsets.UTF_8))))
            .toString().toByteArray(Charsets.UTF_8)
        val out = file.startWrite()
        try { out.write(encoded); file.finishWrite(out) } catch (e: Exception) { file.failWrite(out); throw e }
        cached = token; loaded = true
    }

    fun clear() = synchronized(lock) { cached = null; loaded = true; file.delete() }
}
