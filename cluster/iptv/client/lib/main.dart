import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:window_manager/window_manager.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import 'screens/main_screen.dart';
import 'screens/setup_screen.dart';
import 'screens/purchase_screen.dart';
import 'services/credentials_service.dart';
import 'services/language_service.dart';
import 'services/settings_service.dart';
import 'services/download_service.dart';
import 'services/trial_service.dart';
import 'services/review_service.dart';
import 'services/iap_service.dart';

final trialService = TrialService();
final iapService = IAPService();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize In-App Purchases
  iapService.initialize();
  
  // Track launch for review dialog
  unawaited(ReviewService.trackLaunch());
  
  if (Platform.isAndroid || Platform.isIOS) {
    // Initialisation non-bloquante pour éviter de figer le démarrage si le service Cast est lent
    unawaited(GoogleCastContext.instance.setSharedInstanceWithOptions(
      Platform.isIOS 
        ? IOSGoogleCastOptions(GoogleCastDiscoveryCriteriaInitialize.initWithApplicationID(GoogleCastDiscoveryCriteria.kDefaultApplicationId))
        : GoogleCastOptionsAndroid(appId: GoogleCastDiscoveryCriteria.kDefaultApplicationId)
    ).catchError((e) => debugPrint('Error initializing Google Cast: $e')));
  }

  if (Platform.isLinux || Platform.isWindows || Platform.isMacOS) {
    await windowManager.ensureInitialized();
    windowManager.waitUntilReadyToShow(null, () async {
      await windowManager.show();
      await windowManager.focus();
    });
  }

  MediaKit.ensureInitialized();
  await lang.init();
  await settings.init();
  await downloadService.init();
  await trialService.initTrial();
  final hasCredentials = await CredentialsService.load() != null;
  runApp(IptvApp(startWithSetup: !hasCredentials));
}

class IptvApp extends StatelessWidget {
  final bool startWithSetup;
  const IptvApp({super.key, required this.startWithSetup});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Purple IPTV',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF9D4EDD),
          secondary: Color(0xFF8A2BE2),
          surface: Color(0xFF1A0F2E),
          onSurface: Colors.white,
        ),
        scaffoldBackgroundColor: const Color(0xFF0C0714),
        cardTheme: CardThemeData(
          color: const Color(0xFF1A0F2E),
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.transparent,
          elevation: 0,
          scrolledUnderElevation: 0,
        ),
        progressIndicatorTheme: const ProgressIndicatorThemeData(
          color: Color(0xFF9D4EDD),
        ),
      ),
      home: FutureBuilder<bool>(
        future: trialService.hasAccess(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Scaffold(body: Center(child: CircularProgressIndicator()));
          }
          
          final hasAccess = snapshot.data ?? true;
          if (!hasAccess) {
            return const PurchaseScreen();
          }
          
          return startWithSetup ? const SetupScreen() : const MainScreen();
        },
      ),
      routes: {
        '/setup': (context) => const SetupScreen(),
        '/main': (context) => const MainScreen(),
        '/purchase': (context) => const PurchaseScreen(),
      },
    );
  }
}
