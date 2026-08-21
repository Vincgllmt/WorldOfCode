import java.util.Properties
import java.io.FileInputStream

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
}

/**
 * Lien M3U pré-rempli sur l'écran de connexion, **jamais versionné**.
 *
 * Il porte les identifiants de l'abonnement : le committer serait la faute déjà commise
 * avec `keystore.properties` (cf. §31), sur un dépôt partagé. Il se déclare donc dans
 * `local.properties` — qui est dans le `.gitignore` — sous la clé `purple.defaultM3u`,
 * ou se passe en ligne de commande par `-Ppurple.defaultM3u=...`.
 *
 * Vide par défaut : une build faite ailleurs ne pré-remplit rien.
 */
val defaultM3u: String = run {
    val local = Properties().apply {
        rootProject.file("local.properties").takeIf { it.exists() }?.let { load(FileInputStream(it)) }
    }
    (local.getProperty("purple.defaultM3u")
        ?: providers.gradleProperty("purple.defaultM3u").orNull
        ?: "")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties().apply {
    if (keystorePropertiesFile.exists()) load(FileInputStream(keystorePropertiesFile))
}

android {
    namespace  = "com.purple.iptvplayer.tv"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.purple.iptvplayer.tv"
        minSdk        = 23
        targetSdk     = 36
        versionCode   = 10
        versionName   = "1.2.1"
    }

    signingConfigs {
        create("release") {
            keyAlias      = keystoreProperties["keyAlias"]    as String?
            keyPassword   = keystoreProperties["keyPassword"] as String?
            // rootProject.file() et non file() : cf. app-mobile/build.gradle.kts.
            storeFile     = keystoreProperties["storeFile"]?.let { rootProject.file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }

    // Le detecteur NullSafeMutableLiveData plante l'analyse (incompatibilite entre le
    // lint de `lifecycle` et l'API d'analyse Kotlin du toolchain) : « Found class
    // KaCallableMemberCall, but interface was expected ». C'est un bug de l'outil, pas
    // du code, et il bloquait toute build de release — donc toute publication de l'app
    // TV. Desactive le temps que les versions s'alignent.
    lint { disable += "NullSafeMutableLiveData" }

    defaultConfig {
        buildConfigField("String", "DEFAULT_M3U", "\"${defaultM3u.replace("\"", "\\\"")}\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }

    // Même posture que `core` (§4) : les décisions de l'UI TV sont extraites en objets
    // purs (TvFocusEntry, TvPageJump, TvBackPolicy, TvPlayerKeys, TvFieldKeys) et testées
    // en JVM. Les stubs d'`android.jar` rendent leur valeur par défaut au lieu de lever.
    testOptions {
        unitTests {
            isReturnDefaultValues = true
        }
    }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.koin.androidx.compose)
    implementation(libs.coil.compose)
    implementation(libs.androidx.tv.material)
    // `androidx.tv:tv-foundation` retiré : déprécié — TvLazyColumn/TvLazyRow ont été
    // repliés dans `androidx.compose.foundation.lazy`, qui gère le focus TV depuis
    // Compose 1.7. Zéro import sur les 18 fichiers de app-tv (cf. §42).

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.compose.ui.tooling.preview)

    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}
