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
          (icon: Icons.download_outlined, activeIcon: Icons.download_rounded,  label: lang.t('downloads')),
        ];

        return Scaffold(
          body: Column(
            children: [
              FutureBuilder<int>(
                future: trialService.getRemainingDays(),
                builder: (context, snapshot) {
                  final remaining = snapshot.data ?? 3;
                  final isPro = remaining > 10; // TrialService returns 999 for pro

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
              if (Platform.isAndroid || Platform.isIOS)
                StreamBuilder<GoogleCastSession?>(
                  stream: GoogleCastSessionManager.instance.currentSessionStream,
                  builder: (context, snapshot) {
                    final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
                    if (!isConnected) return const SizedBox.shrink();
                    
                    return StreamBuilder<GoggleCastMediaStatus?>(
                      stream: GoogleCastRemoteMediaClient.instance.mediaStatusStream,
                      builder: (context, mediaSnap) {
                        final status = mediaSnap.data ?? GoogleCastRemoteMediaClient.instance.mediaStatus;
                        if (status == null || status.playerState == CastMediaPlayerState.idle) return const SizedBox.shrink();
                        
                        final metadata = status.mediaInformation?.metadata;
                        String? title;
                        String? subtitle;
                        if (metadata is GoogleCastMovieMediaMetadata) {
                          title = metadata.title;
                          subtitle = metadata.subtitle;
                        }
                        
                        final displayTitle = title ?? 'En cours de lecture';
                        
                        return GestureDetector(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RemoteControlScreen(
                            title: displayTitle,
                            subtitle: subtitle,
                            image: metadata?.images?.isNotEmpty == true ? metadata!.images!.first.url.toString() : null,
                          ))),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: const BoxDecoration(
                              color: Color(0xFF1A0F2E),
                              border: Border(top: BorderSide(color: Color(0xFF9D4EDD), width: 1)),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.cast_connected, color: Color(0xFF9D4EDD), size: 20),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Casting : $displayTitle',
                                        style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Appuyez pour contrôler',
                                        style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: Icon(
                                    status.playerState == CastMediaPlayerState.playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                    color: Colors.white,
                                  ),
                                  onPressed: () {
                                    if (status.playerState == CastMediaPlayerState.playing) {
                                      GoogleCastRemoteMediaClient.instance.pause();
                                    } else {
                                      GoogleCastRemoteMediaClient.instance.play();
                                    }
                                  },
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    );
                  },
                ),
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
