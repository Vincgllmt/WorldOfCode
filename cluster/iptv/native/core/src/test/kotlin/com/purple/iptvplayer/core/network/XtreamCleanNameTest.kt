package com.purple.iptvplayer.core.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/**
 * Nettoyage des noms de chaînes et de catégories.
 *
 * Les chaînes de test ci-dessous sont relevées sur un catalogue réel affiché par
 * l'application : les décorations `●` survivaient au nettoyage alors que `☆`, `★`
 * ou `•` étaient bien retirées.
 */
class XtreamCleanNameTest {

    private val client = XtreamApiClient()

    private val decorations = "●○◉★☆✪✦◈❤♛♕❖◆▶►•·■□▪▫♣♦♥♠✿❀➤⚡✔✓"

    @Test
    fun `les cercles pleins sont retires comme les autres decorations`() {
        assertEquals("FR | FRANCE SPORT | FR", client.cleanName("☆● FR | FRANCE SPORT | FR ●☆"))
    }

    @Test
    fun `un nom encadre de cercles pleins est nettoye`() {
        assertEquals("AFRICA", client.cleanName("● AFRICA●"))
    }

    @Test
    fun `aucune decoration connue ne survit au nettoyage`() {
        val samples = listOf(
            "☆● FR | FRANCE SPORT | FR ●☆",
            "☆● FR | CANAL+ SPORT & LIVE | FR ●☆",
            "● AFRICA●",
            "◉ BEIN SPORTS ◉",
            "■ RMC DECOUVERTE ■",
            "○ EUROSPORT ○",
            // Relevé à l'écran : les symboles de cartes échappaient à la liste.
            "♣♦♣ALAL♣♦♣",
            "♥ TF1 ♥",
            "✿ CANAL+ ✿",
            "⚡ RMC SPORT ⚡",
            "✔ FRANCE 2 ✔",
        )
        for (raw in samples) {
            val cleaned = client.cleanName(raw)
            val leftover = cleaned.filter { it in decorations }
            assertFalse("Décoration résiduelle « $leftover » dans « $cleaned » (source « $raw »)", leftover.isNotEmpty())
        }
    }

    // ─── Non-régression ───────────────────────────────────────────────────────

    @Test
    fun `les decorations deja gerees le restent`() {
        assertEquals("FR | TF1 FHD", client.cleanName("★ FR | TF1 FHD ★"))
        assertEquals("Canal+", client.cleanName("▶ Canal+ ▶"))
    }

    @Test
    fun `les tags entre parentheses sont retires`() {
        assertEquals("FR - TF1", client.cleanName("FR - TF1 (FHD)"))
    }

    @Test
    fun `un nom propre est inchange`() {
        assertEquals("TF1 HD", client.cleanName("TF1 HD"))
        assertEquals("France 2", client.cleanName("France 2"))
    }

    @Test
    fun `le plus de Canal+ n est pas une decoration`() {
        // « + » est un symbole mathématique, pas décoratif : un critère par catégorie
        // Unicode ne doit pas l'emporter avec les étoiles et les cercles.
        assertEquals("CANAL+", client.cleanName("♦ CANAL+ ♦"))
        assertEquals("Canal+ Sport", client.cleanName("Canal+ Sport"))
    }

    @Test
    fun `les caracteres non latins d un nom sont preserves`() {
        // Chaînes arabes, cyrilliques : ce ne sont pas des décorations.
        assertEquals("قناة الجزيرة", client.cleanName("قناة الجزيرة"))
        assertEquals("Первый канал", client.cleanName("Первый канал"))
    }

    @Test
    fun `un nom entierement decoratif retombe sur la source`() {
        // cleanName ne doit jamais renvoyer une chaîne vide.
        assertEquals("●●●", client.cleanName("●●●"))
    }
}
