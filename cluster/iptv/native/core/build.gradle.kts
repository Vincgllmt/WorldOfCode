plugins {
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace  = "com.purple.iptvplayer.core"
    compileSdk = 36

    defaultConfig {
        minSdk = 21
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
