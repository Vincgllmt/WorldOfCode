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
    namespace  = "com.purple.iptvplayer"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.purple.iptvplayer"
        minSdk        = 21
        targetSdk     = 36
        versionCode   = 14
        versionName   = "1.1.6"
    }

    signingConfigs {
        create("release") {
            keyAlias      = keystoreProperties["keyAlias"]    as String?
            keyPassword   = keystoreProperties["keyPassword"] as String?
            // rootProject.file() et non file() : le chemin de keystore.properties
            // (`../client/android/…`) est relatif à `native/`, pas au module. Avec
            // file(), il était résolu en `native/app-mobile/../client/…`, soit un
            // niveau trop bas, et la signature échouait « Keystore file not found ».
            storeFile     = keystoreProperties["storeFile"]?.let { rootProject.file(it) }
            storePassword = keystoreProperties["storePassword"] as String?
        }
    }

    buildTypes {
        // La build de debug s'installe À CÔTÉ de la release au lieu d'exiger sa
        // désinstallation (signatures différentes), ce qui préserve identifiants,
        // état d'abonnement, favoris et téléchargements de l'app de production.
        // Contrepartie : Play Billing ne fonctionne pas sur cette variante, les
        // produits étant liés à l'applicationId publié.
        debug {
            applicationIdSuffix = ".debug"
        }
        release {
            isMinifyEnabled = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }

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
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.koin.androidx.compose)
    implementation(libs.coil.compose)
    implementation(libs.cast.framework)
    implementation(libs.media.router)

    val composeBom = platform(libs.androidx.compose.bom)
    implementation(composeBom)
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.compose.icons.extended)
    debugImplementation(libs.androidx.compose.ui.tooling)
    implementation(libs.androidx.compose.ui.tooling.preview)
}
