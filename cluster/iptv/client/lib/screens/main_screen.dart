import 'package:flutter/material.dart';
import '../services/language_service.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'movies_screen.dart';
import 'series_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _index = 0;
  final ApiService _api = ApiService();

  static const _screens = <Widget>[
    HomeScreen(),
    MoviesScreen(),
    SeriesScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _warmupCache();
  }

  void _warmupCache() {
    // Fetch data in background to fill caches
    _api.fetchChannels();
    _api.fetchMovies();
    _api.fetchSeries();
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: lang.locale,
      builder: (context, locale, _) {
        final items = [
          (icon: Icons.live_tv_outlined,  activeIcon: Icons.live_tv_rounded,  label: lang.t('live')),
          (icon: Icons.movie_outlined,    activeIcon: Icons.movie_rounded,     label: lang.t('movies')),
          (icon: Icons.tv_outlined,       activeIcon: Icons.tv_rounded,        label: lang.t('series')),
        ];

        return Scaffold(
          body: IndexedStack(index: _index, children: _screens),
          bottomNavigationBar: _BottomNav(
            index: _index,
            items: items,
            onTap: (i) => setState(() => _index = i),
          ),
        );
      }
    );
  }
}

class _BottomNav extends StatelessWidget {
  final int index;
  final List<({IconData icon, IconData activeIcon, String label})> items;
  final ValueChanged<int> onTap;

  const _BottomNav({required this.index, required this.items, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0C0714),
        border: Border(top: BorderSide(color: Color(0x339D4EDD), width: 1)),
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: List.generate(items.length, (i) {
              final selected = i == index;
              final item = items[i];
              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(i),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          selected ? item.activeIcon : item.icon,
                          size: 24,
                          color: selected ? const Color(0xFFBB86FC) : const Color(0x55FFFFFF),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
                            color: selected ? const Color(0xFFBB86FC) : const Color(0x55FFFFFF),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
