import 'package:flutter/material.dart';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../services/api_service.dart';
import '../services/language_service.dart';
import '../services/progress_service.dart';
import '../widgets/download_button.dart';
import 'player_screen.dart';
import 'remote_control_screen.dart';

class _C {
  static const bg     = Color(0xFF160B25);
  static const card   = Color(0xFF1F1235);
  static const accent = Color(0xFF9D4EDD);
  static const txtSub = Color(0xFFB0AEC8);
}

class MovieDetailScreen extends StatefulWidget {
  final Movie movie;
  const MovieDetailScreen({super.key, required this.movie});

  @override
  State<MovieDetailScreen> createState() => _MovieDetailScreenState();
}

class _MovieDetailScreenState extends State<MovieDetailScreen> {
  final ApiService _api = ApiService();
  late Future<MovieDetail> _future;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchMovieDetail(widget.movie.id);
  }

  void _play(String url, {bool forceRestart = false}) {
    if (Platform.isAndroid || Platform.isIOS) {
      final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
      if (isConnected) {
        _cast(url);
        return;
      }
    }

    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(
        name: widget.movie.name, 
        url: url, 
        group: widget.movie.group,
        type: 'movie',
        mediaId: widget.movie.id,
        cover: widget.movie.cover,
        forceRestart: forceRestart,
      ),
    ));
  }

  void _cast(String url) async {
    final isHls = url.toLowerCase().contains('.m3u8') || url.toLowerCase().contains('.ts');
    
    // Get last progress
    final progress = await ProgressService.getProgress(url);
    final startSeconds = (progress != null && !progress.isCompleted) ? progress.positionSeconds : 0;

    GoogleCastRemoteMediaClient.instance.loadMedia(GoogleCastMediaInformation(
      contentId: url,
      streamType: CastMediaStreamType.buffered,
      contentType: isHls ? 'application/x-mpegURL' : 'video/mp4',
      metadata: GoogleCastMovieMediaMetadata(
        title: widget.movie.name,
        subtitle: widget.movie.group ?? '',
        images: widget.movie.cover != null ? [GoogleCastImage(url: Uri.parse(widget.movie.cover!))] : null,
      ),
    ));

    if (startSeconds > 0) {
      Future.delayed(const Duration(seconds: 3), () {
        GoogleCastRemoteMediaClient.instance.seek(GoogleCastMediaSeekOption(
          position: Duration(seconds: startSeconds),
          resumeState: GoogleCastMediaResumeState.play,
        ));
      });
    }
    
    if (mounted) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => RemoteControlScreen(
          title: widget.movie.name,
          subtitle: widget.movie.group,
          image: widget.movie.cover,
        ),
      ));
    }
  }

  void _showCastPicker() {
    GoogleCastDiscoveryManager.instance.startDiscovery();
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      backgroundColor: const Color(0xFF1A0F2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 10),
                child: Text('Sélectionner un appareil', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              StreamBuilder<List<GoogleCastDevice>>(
                stream: GoogleCastDiscoveryManager.instance.devicesStream,
                builder: (context, snapshot) {
                  final devices = snapshot.data ?? [];
                  if (devices.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  return ListView.builder(
                    shrinkWrap: true,
                    itemCount: devices.length,
                    itemBuilder: (context, index) {
                      final device = devices[index];
                      return ListTile(
                        leading: const Icon(Icons.cast, color: Colors.white),
                        title: Text(device.friendlyName, style: const TextStyle(color: Colors.white)),
                        subtitle: Text(device.modelName ?? '', style: const TextStyle(color: Colors.white70)),
                        onTap: () {
                          GoogleCastSessionManager.instance.startSessionWithDevice(device);
                          Navigator.pop(context);
                        },
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    ).then((_) => GoogleCastDiscoveryManager.instance.stopDiscovery());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _C.bg,
      body: FutureBuilder<MovieDetail>(
        future: _future,
        builder: (ctx, snap) {
          final detail = snap.data;
          final playUrl = detail?.url ?? widget.movie.url;
          final isLoading = snap.connectionState == ConnectionState.waiting;

          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: _Header(
                  movie: widget.movie,
                  detail: detail,
                ),
              ),
              if (isLoading)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.only(top: 40),
                    child: Center(child: CircularProgressIndicator(color: _C.accent)),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                  sliver: SliverToBoxAdapter(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Synopsis
                        Text(
                          lang.t('synopsis'),
                          style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          (detail?.description != null && detail!.description!.isNotEmpty)
                            ? detail.description!
                            : lang.t('no_description'),
                          style: const TextStyle(color: _C.txtSub, fontSize: 14, height: 1.55),
                        ),
                        const SizedBox(height: 28),

                        // Action Buttons (Play + Download)
                        Column(
                          children: [
                            // Primary Play Button
                            Material(
                              color: _C.accent,
                              borderRadius: BorderRadius.circular(16),
                              elevation: 8,
                              shadowColor: _C.accent.withValues(alpha: 0.4),
                              child: InkWell(
                                onTap: () => _play(playUrl),
                                borderRadius: BorderRadius.circular(16),
                                child: Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.symmetric(vertical: 18),
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 28),
                                      const SizedBox(width: 10),
                                      Text(
                                        lang.t('play_movie').toUpperCase(),
                                        style: const TextStyle(
                                          color: Colors.white, 
                                          fontSize: 16, 
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.1,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            // Secondary Actions Row
                            Row(
                              children: [
                                Material(
                                  color: Colors.white.withValues(alpha: 0.05),
                                  borderRadius: BorderRadius.circular(12),
                                  child: InkWell(
                                    onTap: () => _play(playUrl, forceRestart: true),
                                    borderRadius: BorderRadius.circular(12),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 20),
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(12),
                                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.replay_rounded, color: Colors.white, size: 16),
                                          const SizedBox(width: 8),
                                          Text(
                                            lang.t('play_from_beginning').toUpperCase(),
                                            style: const TextStyle(
                                              color: Colors.white, 
                                              fontSize: 11, 
                                              fontWeight: FontWeight.w900,
                                              letterSpacing: 0.8,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                ),
                                const Spacer(),
                                DownloadButton(
                                  id: widget.movie.id,
                                  title: widget.movie.name,
                                  url: widget.movie.url,
                                  type: 'movie',
                                  cover: widget.movie.cover,
                                  size: 44,
                                ),
                              ],
                            ),
                          ],
                        ),

                        // Cast
                        if (detail?.cast != null && detail!.cast!.isNotEmpty) ...[
                          const SizedBox(height: 28),
                          Text(
                            lang.t('cast'),
                            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            detail.cast!,
                            style: const TextStyle(color: _C.txtSub, fontSize: 14, height: 1.5),
                          ),
                        ],

                        // Director
                        if (detail?.director != null && detail!.director!.isNotEmpty) ...[
                          const SizedBox(height: 20),
                          Text(
                            lang.t('director'),
                            style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            detail.director!,
                            style: const TextStyle(color: _C.txtSub, fontSize: 14),
                          ),
                        ],

                        const SizedBox(height: 60),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final Movie movie;
  final MovieDetail? detail;
  const _Header({required this.movie, required this.detail});

  @override
  Widget build(BuildContext context) {
    final coverUrl = detail?.coverBig ?? detail?.cover ?? movie.cover;
    final year     = detail?.year;
    final rating   = detail?.rating ?? movie.rating;
    final genre    = detail?.genre;
    final duration = detail?.duration;

    return Stack(
      children: [
        // Backdrop image
        SizedBox(
          height: 340,
          width: double.infinity,
          child: coverUrl != null
            ? CachedNetworkImage(
                imageUrl: coverUrl,
                fit: BoxFit.cover,
                placeholder: (_, __) => _fallback(),
                errorWidget: (_, __, ___) => _fallback(),
              )
            : _fallback(),
        ),
        // Gradient overlay
        Container(
          height: 340,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Color(0x550C0714), Color(0xFF0C0714)],
              stops: [0.3, 1.0],
            ),
          ),
        ),
        // Back button
        Positioned(
          top: MediaQuery.of(context).padding.top + 8,
          left: 12,
          child: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
            onPressed: () => Navigator.pop(context),
          ),
        ),
        // Cast button
        if (Platform.isAndroid || Platform.isIOS)
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 12,
            child: StreamBuilder<GoogleCastSession?>(
              stream: GoogleCastSessionManager.instance.currentSessionStream,
              builder: (context, snapshot) {
                final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
                return IconButton(
                  icon: Icon(isConnected ? Icons.cast_connected : Icons.cast, color: isConnected ? _C.accent : Colors.white),
                  onPressed: () {
                    if (isConnected) {
                      final state = context.findAncestorStateOfType<_MovieDetailScreenState>();
                      if (state != null) {
                        state._api.fetchMovieDetail(movie.id).then((detail) {
                          state._cast(detail.url ?? movie.url);
                        });
                      }
                    } else {
                      context.findAncestorStateOfType<_MovieDetailScreenState>()?._showCastPicker();
                    }
                  },
                );
              },
            ),
          ),
        // Info overlay
        Positioned(
          bottom: 20, left: 24, right: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                movie.name,
                style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900, height: 1.15),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 12,
                runSpacing: 4,
                children: [
                  if (year != null && year.isNotEmpty)
                    _Badge(text: year, color: _C.card),
                  if (rating != null && rating.isNotEmpty)
                    _Badge(text: '★  $rating', color: const Color(0xFF332800)),
                  if (genre != null && genre.isNotEmpty)
                    _Badge(text: genre, color: _C.card),
                  if (duration != null && duration.isNotEmpty)
                    _Badge(text: duration, color: _C.card),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _fallback() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF2D1B4E), Color(0xFF0C0714)],
      ),
    ),
    child: const Center(child: Icon(Icons.movie_rounded, size: 80, color: Color(0x449D4EDD))),
  );
}

class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge({required this.text, required this.color});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(6),
    ),
    child: Text(text, style: const TextStyle(color: _C.txtSub, fontSize: 12, fontWeight: FontWeight.w500)),
  );
}
