import 'package:flutter/material.dart';
import 'dart:io';
import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import '../services/api_service.dart';
import '../services/progress_service.dart';
import '../services/language_service.dart';
import '../services/download_service.dart';
import '../widgets/download_button.dart';
import 'player_screen.dart';
import 'remote_control_screen.dart';

import '../widgets/cast_mini_player.dart';

class _C {
  static const bg     = Color(0xFF160B25);
  static const card   = Color(0xFF1F1235);
  static const accent = Color(0xFF9D4EDD);
  static const glow   = Color(0xFFBB86FC);
  static const txtSub = Color(0xFFB0AEC8);
}

class SeriesDetailScreen extends StatefulWidget {
  final SeriesItem series;
  const SeriesDetailScreen({super.key, required this.series});

  @override
  State<SeriesDetailScreen> createState() => _SeriesDetailScreenState();
}

class _SeriesDetailScreenState extends State<SeriesDetailScreen> {
  final ApiService _api = ApiService();
  late Future<SeriesDetail> _future;
  int _expandedSeason = -1;
  StreamSubscription? _castSubscription;
  bool _waitingForCast = false;

  @override
  void initState() {
    super.initState();
    _future = _api.fetchSeriesDetail(widget.series.id);
    if (Platform.isAndroid || Platform.isIOS) {
      _castSubscription = GoogleCastSessionManager.instance.currentSessionStream.listen((session) {
        final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
        if (isConnected && _waitingForCast) {
          _waitingForCast = false;
          _future.then((detail) {
            final sortedSeasons = detail.seasons.keys.toList()
              ..sort((a, b) => int.tryParse(a)!.compareTo(int.tryParse(b)!));
            if (sortedSeasons.isNotEmpty) {
              final firstSeason = detail.seasons[sortedSeasons.first];
              if (firstSeason != null && firstSeason.isNotEmpty) {
                if (mounted) _cast(firstSeason.first, firstSeason);
              }
            }
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _castSubscription?.cancel();
    super.dispose();
  }

  void _play(Episode ep, List<Episode> allEpisodes) {
    if (Platform.isAndroid || Platform.isIOS) {
      final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
      if (isConnected) {
        _cast(ep, allEpisodes);
        return;
      }
    }

    final index = allEpisodes.indexOf(ep);
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(
        name: ep.title, 
        url: ep.url, 
        group: widget.series.name,
        type: 'series',
        mediaId: ep.id,
        seriesId: widget.series.id,
        cover: ep.cover ?? widget.series.cover,
        episodes: allEpisodes,
        initialEpisodeIndex: index,
      ),
    )).then((_) => setState(() {})); // trigger refresh when coming back to update progress indicators
  }

  void _downloadSeason(List<Episode> episodes, int seasonNum) {
    for (final ep in episodes) {
      downloadService.startDownload(DownloadItem(
        id: ep.id,
        title: ep.title,
        url: ep.url,
        type: 'series',
        cover: ep.cover ?? widget.series.cover,
        seriesId: widget.series.id,
        seasonNum: seasonNum,
      ));
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${episodes.length} ${lang.t('episodes_added_to_queue')}'),
        backgroundColor: _C.accent,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  void _cast(Episode ep, List<Episode> allEpisodes) async {
    final urlLower = ep.url.toLowerCase();
    String contentType = 'video/mp4';
    if (urlLower.contains('.m3u8')) contentType = 'application/vnd.apple.mpegurl';
    else if (urlLower.contains('.ts')) contentType = 'video/mp2t';
    else if (urlLower.contains('.mkv')) contentType = 'video/x-matroska';

    // Get last progress or create initial
    final progress = await ProgressService.getProgress(ep.url);
    final startSeconds = (progress != null && !progress.isCompleted) ? progress.positionSeconds : 0;

    // Save initial progress so background tracker knows type/mediaId
    ProgressService.saveProgress(MediaProgress(
      url: ep.url,
      title: ep.title,
      type: 'series',
      mediaId: ep.id,
      seriesId: widget.series.id,
      cover: ep.cover ?? widget.series.cover,
      positionSeconds: startSeconds,
      durationSeconds: progress?.durationSeconds ?? 0,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ), persist: true);

    GoogleCastRemoteMediaClient.instance.loadMedia(GoogleCastMediaInformation(
      contentId: ep.url,
      streamType: CastMediaStreamType.buffered,
      contentType: contentType,
      metadata: GoogleCastMovieMediaMetadata(
        title: ep.title,
        subtitle: widget.series.name,
        images: (ep.cover ?? widget.series.cover) != null ? [GoogleCastImage(url: Uri.parse(ep.cover ?? widget.series.cover!))] : null,
      ),
    ));

    // Wait for load before seeking
    if (startSeconds > 0) {
      Future.delayed(const Duration(seconds: 4), () {
        GoogleCastRemoteMediaClient.instance.seek(GoogleCastMediaSeekOption(
          position: Duration(seconds: startSeconds),
          resumeState: GoogleCastMediaResumeState.play,
        ));
      });
    }
    
    if (mounted) {
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => RemoteControlScreen(
          title: ep.title,
          subtitle: widget.series.name,
          image: ep.cover ?? widget.series.cover,
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
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 0, 8, 10),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Sélectionner un appareil', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    IconButton(
                      icon: const Icon(Icons.info_outline_rounded, color: Colors.white70),
                      tooltip: lang.t('cast_info_title'),
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            backgroundColor: const Color(0xFF1A0F2E),
                            title: Row(
                              children: [
                                const Icon(Icons.info_outline_rounded, color: Color(0xFF9D4EDD)),
                                const SizedBox(width: 10),
                                Expanded(child: Text(lang.t('cast_info_title'), style: const TextStyle(color: Colors.white, fontSize: 16))),
                              ],
                            ),
                            content: Text(lang.t('cast_info_desc'), style: const TextStyle(color: Colors.white70, height: 1.4)),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('OK', style: TextStyle(color: Color(0xFF9D4EDD), fontWeight: FontWeight.bold)),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
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
                          if (mounted) setState(() => _waitingForCast = true);
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
      bottomNavigationBar: const CastMiniPlayer(),
      body: FutureBuilder<SeriesDetail>(
        future: _future,
        builder: (ctx, snap) {
          final detail = snap.data;
          final isLoading = snap.connectionState == ConnectionState.waiting;

          if (snap.hasError) {
            return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: _C.accent),
              const SizedBox(height: 12),
              Text(snap.error.toString(), style: const TextStyle(color: _C.txtSub), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: _C.accent),
                child: Text(lang.t('back'))),
            ]));
          }

          if (isLoading && detail == null) {
            return Stack(
              children: [
                _Header(series: widget.series, detail: null),
                const Center(child: CircularProgressIndicator(color: _C.accent)),
              ],
            );
          }

          final sortedSeasons = detail!.seasons.keys.toList()
            ..sort((a, b) => int.tryParse(a)!.compareTo(int.tryParse(b)!));

          final allEpisodes = <Episode>[];
          for (final sKey in sortedSeasons) {
            allEpisodes.addAll(detail.seasons[sKey] ?? []);
          }

          return CustomScrollView(
            slivers: [
              // Cover + back button
              SliverToBoxAdapter(child: _Header(series: widget.series, detail: detail)),

              // Seasons
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                sliver: SliverToBoxAdapter(
                  child: Text(
                    '${sortedSeasons.length} ${lang.t(sortedSeasons.length > 1 ? 'seasons' : 'season').toLowerCase()}',
                    style: const TextStyle(color: _C.glow, fontSize: 15, fontWeight: FontWeight.w600),
                  ),
                ),
              ),

              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) {
                    final sKey = sortedSeasons[i];
                    final sNum = int.tryParse(sKey) ?? i + 1;
                    final episodes = detail.seasons[sKey] ?? [];
                    final isExpanded = _expandedSeason == sNum;
                    return _SeasonTile(
                      seriesId: widget.series.id,
                      seasonNum: sNum,
                      episodes: episodes,
                      isExpanded: isExpanded,
                      onToggle: () => setState(() => _expandedSeason = isExpanded ? -1 : sNum),
                      onPlayEpisode: (ep) => _play(ep, allEpisodes),
                      onDownloadSeason: () => _downloadSeason(episodes, sNum),
                    );
                  },
                  childCount: sortedSeasons.length,
                ),
              ),

              const SliverPadding(padding: EdgeInsets.only(bottom: 40)),
            ],
          );
        },
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final SeriesItem series;
  final SeriesDetail? detail;
  const _Header({required this.series, this.detail});

  @override
  Widget build(BuildContext context) {
    final name = detail?.name ?? series.name;
    final plot = detail?.plot;

    return Stack(
      children: [
        // Backdrop
        SizedBox(
          height: 340,
          width: double.infinity,
          child: series.cover != null
            ? _buildCover(series.cover!)
            : _fallback(),
        ),
        // Gradient overlay
        Container(
          height: 340,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter, end: Alignment.bottomCenter,
              colors: [Color(0x330C0714), Color(0xFF0C0714)],
              stops: [0.4, 1.0],
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
                      final state = context.findAncestorStateOfType<_SeriesDetailScreenState>();
                      if (state != null) {
                        state._api.fetchSeriesDetail(series.id).then((detail) {
                          final sortedSeasons = detail.seasons.keys.toList()
                            ..sort((a, b) => int.tryParse(a)!.compareTo(int.tryParse(b)!));
                          if (sortedSeasons.isNotEmpty) {
                            final firstSeason = detail.seasons[sortedSeasons.first];
                            if (firstSeason != null && firstSeason.isNotEmpty) {
                              state._cast(firstSeason.first, firstSeason);
                            }
                          }
                        });
                      }
                    } else {
                      context.findAncestorStateOfType<_SeriesDetailScreenState>()?._showCastPicker();
                    }
                  },
                );
              },
            ),
          ),
        // Info
        Positioned(
          bottom: 24, left: 24, right: 24,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, height: 1.1)),
              if (series.rating != null && series.rating!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('★ ${series.rating}', style: const TextStyle(color: Color(0xFFFFD700), fontSize: 13)),
              ],
              if (plot != null && plot.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(plot, maxLines: 3, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _C.txtSub, fontSize: 13, height: 1.4)),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCover(String url) => CachedNetworkImage(
    imageUrl: url,
    fit: BoxFit.cover,
    width: double.infinity,
    placeholder: (_, __) => _shimmer(),
    errorWidget: (_, __, ___) => _fallback(),
  );

  Widget _shimmer() => Container(
    color: Colors.black26,
    child: const Center(child: CircularProgressIndicator(strokeWidth: 2, color: _C.accent)),
  );

  Widget _fallback() => Container(
    decoration: const BoxDecoration(gradient: LinearGradient(
      begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [Color(0xFF2D1B4E), Color(0xFF0C0714)])),
    child: const Center(child: Icon(Icons.tv_rounded, size: 80, color: Color(0x449D4EDD))));
}

class _SeasonTile extends StatelessWidget {
  final int seriesId;
  final int seasonNum;
  final List<Episode> episodes;
  final bool isExpanded;
  final VoidCallback onToggle;
  final void Function(Episode) onPlayEpisode;
  final VoidCallback onDownloadSeason;

  const _SeasonTile({
    required this.seriesId, required this.seasonNum, required this.episodes,
    required this.isExpanded, required this.onToggle,
    required this.onPlayEpisode, required this.onDownloadSeason,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Container(
        decoration: BoxDecoration(
          color: _C.card,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isExpanded ? _C.accent : const Color(0x22FFFFFF), width: 1),
        ),
        child: Column(
          children: [
            // Season header
            InkWell(
              onTap: onToggle,
              borderRadius: BorderRadius.circular(10),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isExpanded ? _C.accent : const Color(0x33FFFFFF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text('${lang.t('season')} $seasonNum',
                        style: TextStyle(
                          color: isExpanded ? Colors.white : _C.txtSub,
                          fontWeight: FontWeight.w700, fontSize: 14,
                        )),
                    ),
                    const SizedBox(width: 12),
                    Text('${episodes.length} ${lang.t(episodes.length > 1 ? 'episodes' : 'episode').toLowerCase()}',
                      style: const TextStyle(color: _C.txtSub, fontSize: 13)),
                    const Spacer(),
                    ListenableBuilder(
                      listenable: downloadService,
                      builder: (context, _) {
                        final inQueue = downloadService.items.where((i) => i.seriesId == seriesId && i.seasonNum == seasonNum && (i.status == DownloadStatus.pending || i.status == DownloadStatus.scheduled || i.status == DownloadStatus.downloading)).length;
                        if (inQueue > 0) {
                          return IconButton(
                            icon: const Icon(Icons.cancel_rounded, color: Colors.redAccent, size: 24),
                            onPressed: () => downloadService.cancelSeasonDownload(seriesId, seasonNum),
                            padding: EdgeInsets.zero,
                            constraints: const BoxConstraints(),
                            tooltip: lang.t('cancel_download'),
                          );
                        }
                        return IconButton(
                          icon: const Icon(Icons.download_for_offline_rounded, color: _C.accent, size: 24),
                          onPressed: onDownloadSeason,
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          tooltip: lang.t('download_season'),
                        );
                      },
                    ),
                    const SizedBox(width: 16),
                    Icon(
                      isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                      color: _C.txtSub,
                    ),
                  ],
                ),
              ),
            ),

            // Episode list
            if (isExpanded)
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: episodes.length,
                separatorBuilder: (_, __) => const Divider(color: Color(0x11FFFFFF), height: 1),
                itemBuilder: (_, i) => _EpisodeTile(
                  seriesId: seriesId,
                  ep: episodes[i], 
                  onPlay: () => onPlayEpisode(episodes[i]),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _EpisodeTile extends StatefulWidget {
  final int seriesId;
  final Episode ep;
  final VoidCallback onPlay;
  const _EpisodeTile({required this.seriesId, required this.ep, required this.onPlay});

  @override
  State<_EpisodeTile> createState() => _EpisodeTileState();
}

class _EpisodeTileState extends State<_EpisodeTile> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<MediaProgress?>(
      future: ProgressService.getProgress(widget.ep.url),
      builder: (context, snapshot) {
        final progress = snapshot.data;
        final bool isCompleted = progress?.isCompleted ?? false;
        final double progressPercent = progress != null && progress.durationSeconds > 0 
            ? (progress.positionSeconds / progress.durationSeconds).clamp(0.0, 1.0) 
            : 0.0;

        return MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() => _hovered = true),
          onExit: (_) => setState(() => _hovered = false),
          child: GestureDetector(
            onTap: widget.onPlay,
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              color: _hovered ? const Color(0x229D4EDD) : Colors.transparent,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Container(
                    width: 32, height: 32,
                    decoration: BoxDecoration(
                      color: _hovered ? _C.accent : const Color(0x22FFFFFF),
                      shape: BoxShape.circle,
                    ),
                    child: _hovered
                      ? const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 20)
                      : Center(child: Text('${widget.ep.episodeNum}',
                          style: const TextStyle(color: _C.txtSub, fontSize: 12, fontWeight: FontWeight.w600))),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(widget.ep.title,
                          style: TextStyle(
                            color: isCompleted ? _C.txtSub : (_hovered ? Colors.white : Colors.white),
                            fontSize: 13, fontWeight: FontWeight.w500,
                            decoration: isCompleted ? TextDecoration.lineThrough : null,
                          ),
                          maxLines: 1, overflow: TextOverflow.ellipsis,
                        ),
                        if (progressPercent > 0 && !isCompleted)
                          Padding(
                            padding: const EdgeInsets.only(top: 4, right: 16),
                            child: LinearProgressIndicator(
                              value: progressPercent,
                              backgroundColor: Colors.white.withValues(alpha: 0.1),
                              color: _C.accent,
                              minHeight: 2,
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  DownloadButton(
                    id: widget.ep.id,
                    title: widget.ep.title,
                    url: widget.ep.url,
                    type: 'series',
                    cover: widget.ep.cover,
                    seriesId: widget.seriesId,
                    seasonNum: widget.ep.season,
                    size: 34,
                  ),
                  const SizedBox(width: 12),
                  if (isCompleted)
                    const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 20)
                  else
                    Icon(Icons.play_arrow_rounded, color: _hovered ? _C.accent : const Color(0x33FFFFFF), size: 20),
                ],
              ),
            ),
          ),
        );
      }
    );
  }
}
