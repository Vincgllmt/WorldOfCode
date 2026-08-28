package com.purple.iptvplayer.core.viewmodel

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * #91 — « Ma liste » ne doit dire « vide » que sur un catalogue **connu**.
 *
 * Les deux premiers tests sont ceux qui échouaient : l'écran concluait « vide » pendant le
 * chargement et, plus grave, en cas d'erreur — laissant croire que les favoris étaient
 * perdus.
 */
class MyListPolicyTest {

    private val chargement = listOf(ContentState.Loading)
    private val succes     = listOf(ContentState.Success(listOf("A")))

    /** Le cas transitoire, à chaque entrée dans l'onglet. */
    @Test
    fun `pendant le chargement, on n'annonce pas une liste vide`() {
        assertEquals(MyListPanel.Loading, MyListPolicy.panelFor(chargement, resolvedIsEmpty = true))
    }

    /** Le cas définitif : catalogue injoignable, favoris bien présents en base. */
    @Test
    fun `en erreur, on le dit au lieu d'inventer une liste vide`() {
        val erreur = listOf(ContentState.Error(ContentFailure.NETWORK))
        assertEquals(
            MyListPanel.Error(ContentFailure.NETWORK),
            MyListPolicy.panelFor(erreur, resolvedIsEmpty = true),
        )
    }

    /**
     * Le terme de comparaison, figé : l'ancienne lecture écrasait les trois états en une
     * liste, dont l'écran déduisait « vide ».
     */
    @Test
    fun `l'ancienne lecture confondait chargement et liste vide`() {
        val etat: ContentState<List<String>> = ContentState.Loading
        val ancien = (etat as? ContentState.Success)?.data ?: emptyList()
        assertTrue("l'écran concluait « vide » sur un simple chargement", ancien.isEmpty())
    }

    @Test
    fun `sur un catalogue connu, vide veut dire vide`() {
        assertEquals(MyListPanel.Empty,   MyListPolicy.panelFor(succes, resolvedIsEmpty = true))
        assertEquals(MyListPanel.Content, MyListPolicy.panelFor(succes, resolvedIsEmpty = false))
    }

    /** Une source encore en route l'emporte : annoncer une panne serait prématuré. */
    @Test
    fun `le chargement l'emporte sur l'erreur`() {
        val mixte = listOf(ContentState.Loading, ContentState.Error(ContentFailure.NETWORK))
        assertEquals(MyListPanel.Loading, MyListPolicy.panelFor(mixte, resolvedIsEmpty = true))
    }

    /** Le filtre « Thèmes » recoupe les trois catalogues : un seul en panne suffit. */
    @Test
    fun `le filtre themes depend des trois catalogues`() {
        val sources = listOf(
            ContentState.Success(listOf("a")),
            ContentState.Error(ContentFailure.UNKNOWN),
            ContentState.Success(listOf("b")),
        )
        assertEquals(
            MyListPanel.Error(ContentFailure.UNKNOWN),
            MyListPolicy.panelFor(sources, resolvedIsEmpty = false),
        )
    }
}
