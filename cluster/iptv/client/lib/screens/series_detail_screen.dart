import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

class _C {
  static const bg     = Color(0xFF0C0714);
  static const card   = Color(0xFF160B25);
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

  void _play(Episode ep) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(name: ep.title, url: ep.url, group: widget.series.name),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _C.bg,
      body: FutureBuilder<SeriesDetail>(
        future: _future,
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: _C.accent));
          }
          if (snap.hasError) {
            return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: _C.accent),
              const SizedBox(height: 12),
              Text(snap.error.toString(), style: const TextStyle(color: _C.txtSub), textAlign: TextAlign.center),
              const SizedBox(height: 16),
              ElevatedButton(onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(backgroundColor: _C.accent),
                child: const Text('Retour')),
            ]));
          }

          final detail = snap.data!;
          final sortedSeasons = detail.seasons.keys.toList()
            ..sort((a, b) => int.tryParse(a)!.compareTo(int.tryParse(b)!));

          if (_expandedSeason == -1 && sortedSeasons.isNotEmpty) {
            _expandedSeason = int.tryParse(sortedSeasons.first) ?? 1;
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
                    '${sortedSeasons.length} saison${sortedSeasons.length > 1 ? 's' : ''}',
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
                      seasonNum: sNum,
                      episodes: episodes,
                      isExpanded: isExpanded,
                      onToggle: () => setState(() => _expandedSeason = isExpanded ? -1 : sNum),
                      onPlayEpisode: _play,
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
  final SeriesDetail detail;
  const _Header({required this.series, required this.detail});

  @override
  Widget build(BuildContext context) {
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
              Text(detail.name, style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900, height: 1.1)),
              if (series.rating != null && series.rating!.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('★ ${series.rating}', style: const TextStyle(color: Color(0xFFFFD700), fontSize: 13)),
              ],
              if (detail.plot != null && detail.plot!.isNotEmpty) ...[
                const SizedBox(height: 10),
                Text(detail.plot!, maxLines: 3, overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: _C.txtSub, fontSize: 13, height: 1.4)),
              ],
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCover(String url) => Image.network(url, fit: BoxFit.cover, width: double.infinity,
    errorBuilder: (_, __, ___) => _fallback());

  Widget _fallback() => Container(
    decoration: const BoxDecoration(gradient: LinearGradient(
      begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [Color(0xFF2D1B4E), Color(0xFF0C0714)])),
    child: const Center(child: Icon(Icons.tv_rounded, size: 80, color: Color(0x449D4EDD))));
}

class _SeasonTile extends StatelessWidget {
  final int seasonNum;
  final List<Episode> episodes;
  final bool isExpanded;
  final VoidCallback onToggle;
  final void Function(Episode) onPlayEpisode;

  const _SeasonTile({
    required this.seasonNum, required this.episodes,
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
                      child: Text('Saison $seasonNum',
                        style: TextStyle(
                          color: isExpanded ? Colors.white : _C.txtSub,
                          fontWeight: FontWeight.w700, fontSize: 14,
                        )),
                    ),
                    const SizedBox(width: 12),
                    Text('${episodes.length} épisode${episodes.length > 1 ? 's' : ''}',
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
                itemBuilder: (_, i) => _EpisodeTile(ep: episodes[i], onPlay: () => onPlayEpisode(episodes[i])),
              ),
          ],
        ),
      ),
    );
  }
}

class _EpisodeTile extends StatefulWidget {
  final Episode ep;
  final VoidCallback onPlay;
  const _EpisodeTile({required this.ep, required this.onPlay});

  @override
  State<_EpisodeTile> createState() => _EpisodeTileState();
}

class _EpisodeTileState extends State<_EpisodeTile> {
  bool _hovered = false;

  void _showSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      backgroundColor: _C.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _EpisodeSheet(ep: widget.ep, onPlay: widget.onPlay),
    );
  }

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: () => _showSheet(context),
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
                child: Text(widget.ep.title,
                  style: TextStyle(
                    color: _hovered ? Colors.white : _C.txtSub,
                    fontSize: 13, fontWeight: FontWeight.w500,
                  ),
                  maxLines: 1, overflow: TextOverflow.ellipsis,
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: _hovered ? _C.accent : const Color(0x33FFFFFF), size: 20),
            ],
          ),
        ),
      ),
    );
  }
}

class _EpisodeSheet extends StatelessWidget {
  final Episode ep;
  final VoidCallback onPlay;
  const _EpisodeSheet({required this.ep, required this.onPlay});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle bar
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 18),
              decoration: BoxDecoration(
                color: const Color(0x44FFFFFF),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // Episode number + title
          Text(
            'Épisode ${ep.episodeNum} — ${ep.title}',
            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 14),

          // Thumbnail
          if (ep.cover != null) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: AspectRatio(
                aspectRatio: 16 / 9,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxHeight: 160),
                  child: CachedNetworkImage(
                    imageUrl: ep.cover!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: const Color(0xFF1A0F2E)),
                    errorWidget: (_, __, ___) => Container(color: const Color(0xFF1A0F2E)),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Duration
          if (ep.duration != null) ...[
            Text(
              '⏱ ${ep.duration}',
              style: const TextStyle(color: _C.txtSub, fontSize: 13),
            ),
            const SizedBox(height: 10),
          ],

          // Plot / description
          Text(
            (ep.plot != null && ep.plot!.isNotEmpty)
              ? ep.plot!
              : 'Aucune description disponible.',
            style: const TextStyle(color: _C.txtSub, fontSize: 13, height: 1.5),
            maxLines: 6,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 20),

          // Play button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.pop(context);
                onPlay();
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: _C.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                elevation: 0,
              ),
              icon: const Icon(Icons.play_arrow_rounded, size: 22),
              label: const Text(
                'Lire l\'épisode',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}
