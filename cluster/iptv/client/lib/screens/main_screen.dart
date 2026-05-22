import 'package:flutter/material.dart';
import 'dart:io';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../main.dart';
import '../services/language_service.dart';
import '../services/api_service.dart';
import 'home_screen.dart';
import 'movies_screen.dart';
import 'series_screen.dart';
import 'downloads_screen.dart';
import 'remote_control_screen.dart';
import '../widgets/cast_mini_player.dart';

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
    DownloadsScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _warmupCache();
    _checkActiveCast();
  }

  void _checkActiveCast() {
    // Give it a moment to initialize the session manager
    Future.delayed(const Duration(seconds: 2), () {
      final session = GoogleCastSessionManager.instance.currentSession;
      if (session != null && GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected) {
        final status = GoogleCastRemoteMediaClient.instance.mediaStatus;
        if (status != null && status.playerState != CastMediaPlayerState.idle) {
          final metadata = status.mediaInformation?.metadata;
          String title = 'En cours de lecture';
          String? subtitle;
          String? image;
          
          if (metadata is GoogleCastMovieMediaMetadata) {
            title = metadata.title ?? title;
            subtitle = metadata.subtitle;
            image = metadata.images?.isNotEmpty == true ? metadata.images!.first.url.toString() : null;
          }

          if (mounted) {
            Navigator.push(context, MaterialPageRoute(builder: (_) => RemoteControlScreen(
              title: title,
              subtitle: subtitle,
              image: image,
            )));
          }
        }
      }
    });
  }

  void _warmupCache() {
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
          (icon: Icons.download_outlined, activeIcon: Icons.download_rounded,  label: lang.t('downloads')),
        ];

        return Scaffold(
          backgroundColor: const Color(0xFF0C0714),
          body: Column(
            children: [
              FutureBuilder<int>(
                future: trialService.getRemainingDays(),
                builder: (context, snapshot) {
                  final remaining = snapshot.data ?? 3;
                  final isPro = remaining > 10;

                  if (isPro) return const SizedBox.shrink();

                  return Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
                    color: const Color(0xFF9D4EDD),
                    child: SafeArea(
                      bottom: false,
                      child: Row(
                        children: [
                          const Icon(Icons.timer_outlined, size: 16, color: Colors.white),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              remaining > 0 
                                ? lang.t('trial_remaining').replaceFirst('{}', remaining.toString())
                                : lang.t('trial_expires_today'),
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ),
                          TextButton(
                            onPressed: () => Navigator.of(context).pushNamed('/purchase'),
                            style: TextButton.styleFrom(
                              backgroundColor: Colors.white.withOpacity(0.2),
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                              minimumSize: const Size(0, 30),
                            ),
                            child: Text(lang.t('activate'), style: const TextStyle(fontSize: 11)),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              Expanded(
                child: IndexedStack(index: _index, children: _screens),
              ),
            ],
          ),
          bottomNavigationBar: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CastMiniPlayer(),
              _BottomNav(
                index: _index,
                items: items,
                onTap: (i) => setState(() => _index = i),
              ),
            ],
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
              return _BottomNavItem(
                item: items[i],
                selected: i == index,
                onTap: () => onTap(i),
              );
            }),
          ),
        ),
      ),
    );
  }
}

class _BottomNavItem extends StatefulWidget {
  final ({IconData icon, IconData activeIcon, String label}) item;
  final bool selected;
  final VoidCallback onTap;

  const _BottomNavItem({required this.item, required this.selected, required this.onTap});

  @override
  State<_BottomNavItem> createState() => _BottomNavItemState();
}

class _BottomNavItemState extends State<_BottomNavItem> {
  bool _isFocused = false;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: widget.onTap,
          hoverColor: const Color(0xFF9D4EDD).withOpacity(0.2),
          onFocusChange: (v) => setState(() => _isFocused = v),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            decoration: BoxDecoration(
              color: _isFocused ? Colors.white.withOpacity(0.1) : Colors.transparent,
              border: _isFocused ? const Border(bottom: BorderSide(color: Color(0xFFBB86FC), width: 2)) : null,
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  widget.selected ? widget.item.activeIcon : widget.item.icon,
                  size: 24,
                  color: (widget.selected || _isFocused) ? const Color(0xFFBB86FC) : const Color(0x55FFFFFF),
                ),
                const SizedBox(height: 3),
                Text(
                  widget.item.label,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: (widget.selected || _isFocused) ? FontWeight.w700 : FontWeight.normal,
                    color: (widget.selected || _isFocused) ? const Color(0xFFBB86FC) : const Color(0x55FFFFFF),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
