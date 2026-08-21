package com.purple.iptvplayer.tv.ui.theme

import androidx.compose.ui.graphics.Color
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * G10 — l'élément focalisé était le moins lisible de l'écran.
 *
 * Mesures de l'audit, au pixel :
 * ```
 * ligne de chaîne au repos   #FFFFFF sur #1B0E36  →  18,06 : 1
 * ligne de chaîne FOCALISÉE  #FFFFFF sur #B36BFC  →   3,27 : 1
 * genre FOCALISÉ                                  →   3,27 : 1
 * ```
 *
 * Le contraste WCAG est de l'arithmétique pure : il se teste sans appareil, et ce test
 * **échoue** si quelqu'un rétablit un contenu clair sur l'accent — ce qui est exactement le
 * défaut à empêcher de revenir.
 */
class TvContrastTest {

    /** Luminance relative WCAG 2.x. */
    private fun luminance(c: Color): Double {
        fun channel(v: Float): Double {
            val s = v.toDouble()
            return if (s <= 0.03928) s / 12.92 else ((s + 0.055) / 1.055).pow(2.4)
        }
        return 0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)
    }

    private fun ratio(a: Color, b: Color): Double {
        val la = luminance(a)
        val lb = luminance(b)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    /** Contrôle de l'instrument : les valeurs de l'audit doivent se retrouver. */
    @Test
    fun `la formule reproduit les mesures de l audit`() {
        val atRest = ratio(Color.White, PurplePalette.Bg2)
        assertTrue("blanc sur Bg2 attendu ≈ 18,06, trouvé $atRest", atRest in 17.5..18.5)

        val whiteOnAccent = ratio(Color.White, PurplePalette.Purple400)
        assertTrue("blanc sur Purple400 attendu ≈ 3,27, trouvé $whiteOnAccent", whiteOnAccent in 3.0..3.5)
    }

    /**
     * Le correctif : **6,00 : 1**, au-dessus du seuil WCAG AA (4,5) et presque le double du
     * blanc. C'est aussi le plafond praticable — `#0B0414`, presque noir, ne monte qu'à
     * 6,17 : on ne gagnerait rien à assombrir davantage.
     */
    @Test
    fun `le contenu sur accent clair est lisible`() {
        val r = ratio(PurplePalette.FgOnPrimary, PurplePalette.Purple400)
        assertTrue("FgOnPrimary sur Purple400 doit dépasser 5,5 : 1, trouvé $r", r >= 5.5)
        assertTrue(
            "le sombre doit battre nettement le blanc, sinon le correctif ne sert à rien",
            r > ratio(Color.White, PurplePalette.Purple400) * 1.5,
        )
    }

    /**
     * **L'accent pressé est plus SOMBRE** (`Purple600`) : y garder le jeton sombre le ferait
     * tomber à 3,68 alors que le blanc y donne 5,32. Un contenu uniforme aurait dégradé
     * l'état pressé en corrigeant le focus — le défaut symétrique que §8.14 interdit.
     *
     * Ce test verrouille la règle : le contenu suit la clarté du fond.
     */
    @Test
    fun `le contenu sur accent presse suit la clarte du fond`() {
        val dark  = ratio(PurplePalette.FgOnPrimary, PurplePalette.Purple600)
        val light = ratio(PurplePalette.Fg1, PurplePalette.Purple600)
        assertTrue("sur l'accent pressé, le clair doit l'emporter ($light vs $dark)", light > dark)
        assertTrue("et dépasser 4,5 : 1, trouvé $light", light >= 4.5)
    }

    /** Le repos ne doit pas régresser en corrigeant le focus. */
    @Test
    fun `le contenu au repos reste lisible`() {
        for ((name, bg) in listOf(
            "Bg0" to PurplePalette.Bg0, "Bg1" to PurplePalette.Bg1,
            "Bg2" to PurplePalette.Bg2, "Bg3" to PurplePalette.Bg3,
        )) {
            val r = ratio(PurplePalette.Fg1, bg)
            assertTrue("Fg1 sur $name doit dépasser 7 : 1, trouvé $r", r >= 7.0)
        }
    }

    /**
     * L'étoile des favoris est le piège de G10 : corriger le texte et laisser l'icône en or
     * ne corrigerait qu'à moitié. Ce test constate que l'or est bien **inutilisable** sur
     * l'accent, ce qui justifie la bascule sur le jeton.
     */
    @Test
    fun `l or des favoris est illisible sur l accent`() {
        val gold = Color(0xFFFFD700)
        val r = ratio(gold, PurplePalette.Purple400)
        assertTrue("l'or sur l'accent devrait rester sous 3 : 1, trouvé $r", r < 3.0)
    }
}
