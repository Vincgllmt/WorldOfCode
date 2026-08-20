import java.util.Properties
import java.io.FileInputStream

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
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
        versionCode   = 9
        versionName   = "1.2.0"
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

    buildFeatures { compose = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(project(":core"))
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.koin.androidx.compose)
    implementation(libs.coil.compose)
    implementation(libs.androidx.tv.material)
    implementation(libs.androidx.tv.foundation)

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.compose.ui.tooling.preview)
}
