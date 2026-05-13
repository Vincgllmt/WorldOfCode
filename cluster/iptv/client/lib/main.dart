import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'screens/main_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  MediaKit.ensureInitialized();
  runApp(const IptvApp());
}

class IptvApp extends StatelessWidget {
  const IptvApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'TuTuTu',
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
      home: const MainScreen(),
    );
  }
}
