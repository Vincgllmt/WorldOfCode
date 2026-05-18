import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import '../services/api_service.dart';
import '../services/progress_service.dart';
import '../services/language_service.dart';
import '../widgets/download_button.dart';
import 'player_screen.dart';

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

  @override
  void initState() {
    super.initState();
    _future = _api.fetchSeriesDetail(widget.series.id);
  }

  void _play(Episode ep, List<Episode> allEpisodes) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _C.bg,
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

  const _SeasonTile({
    required this.seriesId, required this.seasonNum, required this.episodes,
    required this.isExpanded, required this.onToggle,
    required this.onPlayEpisode,
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
