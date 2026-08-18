package com.purple.iptvplayer.core

import kotlinx.coroutines.test.runTest
import org.json.JSONArray
import org.junit.Assert.assertEquals
import org.junit.Test

/**
 * Vérifie que l'infrastructure de test JVM est opérationnelle.
 *
 * Le test [orgJsonIsAvailable] n'est pas décoratif : sans une implémentation
 * réelle d'`org.json` sur le classpath de test, le stub d'`android.jar` lève
 * « not mocked » et tout test de [com.purple.iptvplayer.core.data.ProgressRepository]
 * devient impossible. Il garde cette dépendance en place.
 */
class ToolchainSmokeTest {

    @Test
    fun junitRuns() {
        assertEquals(4, 2 + 2)
    }

    @Test
    fun orgJsonIsAvailable() {
        val arr = JSONArray("""[{"id":"42"}]""")
        assertEquals("42", arr.getJSONObject(0).getString("id"))
    }

    @Test
    fun coroutinesTestRuns() = runTest {
        assertEquals("ok", suspendingOk())
    }

    private suspend fun suspendingOk(): String = "ok"
}
