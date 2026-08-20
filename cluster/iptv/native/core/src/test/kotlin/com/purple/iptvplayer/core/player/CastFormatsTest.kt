package com.purple.iptvplayer.core.player

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Les URL de ces tests sont celles réellement servies par le panneau Xtream de
 * l'utilisateur : `{host}/movie/{user}/{pass}/{id}.{ext}` pour un film,
 * `{host}/{user}/{pass}/{id}` pour une chaîne live.
 */
class CastFormatsTest {

    private val base = "http://spacep2.com/movie/USER/PASS"

    @Test
    fun `le mp4 est diffusable`() {
        assertTrue(CastFormats.isCastable("$base/479268.mp4"))
        assertEquals("video/mp4", CastFormats.contentType("$base/479268.mp4"))
    }

    @Test
    fun `le mkv ne l est pas`() {
        // 76 % du catalogue. C'est le cœur du défaut.
        assertFalse(CastFormats.isCastable("$base/477580.mkv"))
        assertTrue(CastFormats.isKnownUnsupported("$base/477580.mkv"))
    }

    @Test
    fun `l avi non plus`() {
        assertFalse(CastFormats.isCastable("$base/206207.avi"))
        assertTrue(CastFormats.isKnownUnsupported("$base/206207.avi"))
    }

    @Test
    fun `les flux adaptatifs sont diffusables`() {
        assertTrue(CastFormats.isCastable("http://x.tv/live/u/p/1.m3u8"))
        assertEquals("application/x-mpegURL", CastFormats.contentType("http://x.tv/live/u/p/1.m3u8"))
        assertTrue(CastFormats.isCastable("http://x.tv/v.mpd"))
    }

    @Test
    fun `une chaine live sans extension n est pas diffusable`() {
        // Flux MPEG-TS nu : le récepteur ne le lit pas.
        assertFalse(CastFormats.isCastable("http://spacep2.com/USER/PASS/12345"))
    }

    @Test
    fun `le ts brut est reconnu comme non diffusable`() {
        assertFalse(CastFormats.isCastable("http://x.tv/u/p/1.ts"))
        assertTrue(CastFormats.isKnownUnsupported("http://x.tv/u/p/1.ts"))
    }

    @Test
    fun `la query string ne fausse pas la detection`() {
        assertTrue(CastFormats.isCastable("http://x.tv/a/b.mp4?token=42"))
        assertFalse(CastFormats.isCastable("http://x.tv/a/b.mkv?token=42"))
    }

    @Test
    fun `la casse de l extension est ignoree`() {
        assertTrue(CastFormats.isCastable("http://x.tv/a/B.MP4"))
        assertFalse(CastFormats.isCastable("http://x.tv/a/B.MKV"))
    }

    @Test
    fun `une url vide ou nulle n est pas diffusable et n est pas dite incompatible`() {
        assertFalse(CastFormats.isCastable(null))
        assertFalse(CastFormats.isKnownUnsupported(null))
        assertFalse(CastFormats.isCastable(""))
    }

    @Test
    fun `un point dans le chemin ne fait pas passer pour une extension`() {
        // « .com » est dans l'hôte, pas dans le nom de fichier.
        assertEquals(null, CastFormats.extensionOf("http://spacep2.com/live/u/p/9"))
    }
}
