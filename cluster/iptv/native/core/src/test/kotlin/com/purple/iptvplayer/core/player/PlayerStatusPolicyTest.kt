package com.purple.iptvplayer.core.player

import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * G1 — cause réelle : le statut d'erreur ne survivait pas à l'événement suivant.
 *
 * Mesuré à l'émulateur (§45) : le flux échoue en `HTTP 407`, `onPlayerError` pose
 * `PlayerStatus.ERROR`, puis ExoPlayer bascule en `STATE_IDLE` et
 * `onPlaybackStateChanged` écrase le statut. Le relevé `uiautomator` de l'écran de lecture
 * ne rapportait **aucun** nœud texte, exactement comme dans l'audit.
 *
 * La logique vivant dans `core`, le bloc d'erreur du **mobile** était touché de la même
 * façon depuis toujours.
 */
class PlayerStatusPolicyTest {

    /** Le cas du défaut : c'est le seul écrasement à interdire. */
    @Test
    fun `le IDLE qui suit un echec n efface pas l erreur`() {
        assertEquals(
            PlayerStatus.ERROR,
            PlayerStatusPolicy.reconcile(PlayerStatus.ERROR, PlayerStatus.IDLE),
        )
    }

    /**
     * Une relance doit sortir de l'erreur : sans cela « Réessayer » laisserait le message
     * affiché sur un flux qui repart — on remplacerait un défaut par son symétrique.
     */
    @Test
    fun `une relance efface l erreur`() {
        assertEquals(
            PlayerStatus.BUFFERING,
            PlayerStatusPolicy.reconcile(PlayerStatus.ERROR, PlayerStatus.BUFFERING),
        )
        assertEquals(
            PlayerStatus.PLAYING,
            PlayerStatusPolicy.reconcile(PlayerStatus.ERROR, PlayerStatus.PLAYING),
        )
    }

    /** Hors erreur, la réconciliation est transparente : elle ne doit rien inventer. */
    @Test
    fun `hors erreur le statut entrant passe tel quel`() {
        for (previous in PlayerStatus.entries) {
            if (previous == PlayerStatus.ERROR) continue
            for (incoming in PlayerStatus.entries) {
                assertEquals(
                    "previous=$previous incoming=$incoming",
                    incoming,
                    PlayerStatusPolicy.reconcile(previous, incoming),
                )
            }
        }
    }

    /** Une erreur qui succède à une erreur reste une erreur. */
    @Test
    fun `l erreur est idempotente`() {
        assertEquals(
            PlayerStatus.ERROR,
            PlayerStatusPolicy.reconcile(PlayerStatus.ERROR, PlayerStatus.ERROR),
        )
    }
}
