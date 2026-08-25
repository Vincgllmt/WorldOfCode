import java.util.Properties
import java.io.FileInputStream

plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

/**
 * Déverrouillage **local** de l'accès, pour les builds faites sur le poste du
 * propriétaire de l'application.
 *
 * Le besoin : l'essai dure trois jours, et une build **chargée latéralement** ne peut ni
 * acheter ni restaurer — Play ne fait autorité que sur ce qu'il a lui-même installé (§9).
 * Passé le troisième jour, l'app TV sideloadée devient donc une **impasse définitive**
 * pour son propre auteur : la barrière s'affiche, et aucun des deux boutons de repli ne
 * peut aboutir. Ce n'était pas une décision, c'était un angle mort.
 *
 * Même dispositif que `purple.defaultM3u` (§41) : la clé vit dans `local.properties`, qui
 * est dans le `.gitignore`, ou se passe par `-Ppurple.unlock=true`. **Faux par défaut** —
 * une build faite ailleurs, ou par la CI, ne déverrouille rien.
 *
 * ⚠️ **Il n'agit que sur la variante debug** : voir le `buildTypes` ci-dessous, où la
 * release est câblée à `false` en dur. C'est ce qui rend la publication d'une build
 * déverrouillée impossible, plutôt que seulement déconseillée.
 */
val ownerUnlock: Boolean = run {
    val local = Properties().apply {
        rootProject.file("local.properties").takeIf { it.exists() }?.let { load(FileInputStream(it)) }
    }
    val raw = local.getProperty("purple.unlock")
        ?: providers.gradleProperty("purple.unlock").orNull
        ?: "false"
    raw.toBooleanStrictOrNull() ?: false
}

if (ownerUnlock) {
    logger.warn("⚠️  purple.unlock=true : accès déverrouillé sans essai ni achat. NE PAS PUBLIER cette build.")
}

android {
    namespace  = "com.purple.iptvplayer.core"
    compileSdk = 36

    buildFeatures { buildConfig = true }

    defaultConfig {
        minSdk = 21
    }

    // Le drapeau n'existe **que** en debug. La release est câblée à `false` en dur, quoi
    // que dise `local.properties` : un AAB déverrouillé donnerait l'application
    // gratuitement à tout le monde, et un avertissement en sortie de build est un
    // garde-fou trop faible pour ce risque-là. Ici, l'erreur n'est plus possible.
    buildTypes {
        getByName("debug")   { buildConfigField("boolean", "OWNER_UNLOCK", ownerUnlock.toString()) }
        getByName("release") { buildConfigField("boolean", "OWNER_UNLOCK", "false") }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    testOptions {
        unitTests {
            isReturnDefaultValues = true
        }
    }
}

dependencies {
    api(libs.androidx.core.ktx)
    api(libs.androidx.lifecycle.viewmodel.ktx)
    api(libs.kotlinx.coroutines.android)
    api(libs.koin.android)
    implementation(libs.okhttp)
    implementation(libs.moshi.kotlin)
    api(libs.androidx.datastore.preferences)
    api(libs.androidx.security.crypto)
    api(libs.billing)
    api(libs.androidx.media3.exoplayer)
    api(libs.androidx.media3.hls)
    api(libs.androidx.media3.dash)
    api(libs.androidx.media3.ui)
    api(libs.androidx.media3.session)
    implementation(libs.play.review.ktx)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.org.json)
}
