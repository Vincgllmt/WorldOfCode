import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

class _C {
  static const bg     = Color(0xFF0C0714);
  static const card   = Color(0xFF160B25);
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

  void _play(String url) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(name: widget.movie.name, url: url, group: widget.movie.group),
    ));
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
                        const Text(
                          'Synopsis',
                          style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          (detail?.description != null && detail!.description!.isNotEmpty)
                            ? detail.description!
                            : 'Aucune description disponible.',
                          style: const TextStyle(color: _C.txtSub, fontSize: 14, height: 1.55),
                        ),
                        const SizedBox(height: 28),

                        // Play button
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: () => _play(playUrl),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: _C.accent,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0,
                            ),
                            icon: const Icon(Icons.play_arrow_rounded, size: 24),
                            label: const Text(
                              'Lire le film',
                              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                            ),
                          ),
                        ),

                        // Cast
                        if (detail?.cast != null && detail!.cast!.isNotEmpty) ...[
                          const SizedBox(height: 28),
                          const Text(
                            'Avec',
                            style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
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
                          const Text(
                            'Réalisateur',
                            style: TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700),
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
        // Gradient overlay (no BackdropFilter — crashes Linux OpenGL)
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
