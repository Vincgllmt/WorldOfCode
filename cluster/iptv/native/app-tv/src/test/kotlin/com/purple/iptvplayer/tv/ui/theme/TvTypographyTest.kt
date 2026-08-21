package com.purple.iptvplayer.tv.ui.theme

import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.sp
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * M3 — 34 des 64 tailles de police de `app-tv` étaient sous 14 sp, dont deux à **8 sp**
 * (badges FILM / SÉRIE de « Ma liste ») et trois à 10 sp.
 *
 * Le minimum Android TV est **12 sp** ; un badge à 8 sp mesure 16 px de haut sur un écran
 * 1080p. Ce test verrouille le plancher du socle typographique : les littéraux au fil des
 * écrans ne s'y prêtent pas, mais le socle, lui, est vérifiable.
 */
class TvTypographyTest {

    private val styles: List<Pair<String, TextUnit>> = with(DefaultPurpleType) {
        listOf(
            "heroTitle" to heroTitle.fontSize, "h1" to h1.fontSize, "h2" to h2.fontSize,
            "h3" to h3.fontSize, "body" to body.fontSize, "bodySmall" to bodySmall.fontSize,
            "meta" to meta.fontSize, "capsLabel" to capsLabel.fontSize,
            "brandWordmark" to brandWordmark.fontSize, "button" to button.fontSize,
            "badge" to TvBadgeText.fontSize,
        )
    }

    @Test
    fun `aucun style ne descend sous le plancher Android TV`() {
        assertTrue("le plancher doit valoir 12 sp", TvMinFontSize == 12.sp)
        for ((name, size) in styles) {
            assertTrue("$name = $size, sous le plancher $TvMinFontSize", size.value >= TvMinFontSize.value)
        }
    }

    /**
     * Le texte **courant** — celui qu'on lit, pas qu'on repère — doit atteindre la
     * recommandation Android TV de 18 sp. C'est `body` : lignes de chaînes, titres de
     * films, synopsis.
     */
    @Test
    fun `le texte courant atteint la recommandation de 18 sp`() {
        assertTrue(
            "body = ${DefaultPurpleType.body.fontSize}, attendu ≥ 18 sp",
            DefaultPurpleType.body.fontSize.value >= 18f,
        )
    }

    /** L'interligne doit suivre la taille, sinon les lignes se chevauchent. */
    @Test
    fun `l interligne reste superieur a la taille`() {
        with(DefaultPurpleType) {
            for ((name, style) in listOf(
                "body" to body, "bodySmall" to bodySmall, "meta" to meta,
                "capsLabel" to capsLabel, "h1" to h1, "h2" to h2, "h3" to h3,
            )) {
                assertTrue(
                    "$name : interligne ${style.lineHeight} < taille ${style.fontSize}",
                    style.lineHeight.value >= style.fontSize.value,
                )
            }
        }
    }
}
