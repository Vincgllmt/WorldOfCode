package com.purple.iptvplayer.core.data

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Une restauration qui aboutit ne doit **rien** faire écrire à l'appelant (#70).
 *
 * Le défaut : `restorePurchases()` reposait `Idle` au retour de l'appel, écrasant le
 * `PurchaseSuccess` que le collecteur venait de poser — seul état qui referme la
 * barrière. L'abonné restait enfermé, et de façon **intermittente** : selon qu'une
 * recomposition tombait ou non entre les deux écritures. C'est le genre de défaut qu'un
 * essai manuel déclare corrigé une fois sur deux ; ici il se décide sans écran.
 */
class RestorePolicyTest {

    @Test
    fun `un droit rendu ne doit rien faire ecrire`() {
        assertEquals(RestorePolicy.Decision.RESTORED, RestorePolicy.decide(threw = false, restoredCount = 1))
        assertEquals(RestorePolicy.Decision.RESTORED, RestorePolicy.decide(threw = false, restoredCount = 4))
    }

    @Test
    fun `un compte sans achat se distingue d un echec`() {
        // Les deux menaient au même écran muet ; ce sont deux messages différents.
        assertEquals(
            RestorePolicy.Decision.NOTHING_TO_RESTORE,
            RestorePolicy.decide(threw = false, restoredCount = 0),
        )
        assertEquals(
            RestorePolicy.Decision.FAILED,
            RestorePolicy.decide(threw = true, restoredCount = null),
        )
    }

    @Test
    fun `un appel qui leve ne peut pas passer pour une restauration`() {
        // Le piège : `outcome.getOrNull()` vaut `null` quand l'appel a levé. Décider sur
        // le seul `== 0` faisait tomber ce cas dans la branche « succès ».
        assertEquals(RestorePolicy.Decision.FAILED, RestorePolicy.decide(threw = true, restoredCount = null))
        assertEquals(RestorePolicy.Decision.FAILED, RestorePolicy.decide(threw = false, restoredCount = null))
    }

    @Test
    fun `un compte negatif est traite comme vide, pas comme un succes`() {
        assertEquals(
            RestorePolicy.Decision.NOTHING_TO_RESTORE,
            RestorePolicy.decide(threw = false, restoredCount = -1),
        )
    }

    @Test
    fun `les trois issues sont distinctes`() {
        // Une table qui renverrait partout la même décision passerait les tests par cas.
        val issues = setOf(
            RestorePolicy.decide(threw = true,  restoredCount = null),
            RestorePolicy.decide(threw = false, restoredCount = 0),
            RestorePolicy.decide(threw = false, restoredCount = 2),
        )
        assertEquals(3, issues.size)
    }
}
