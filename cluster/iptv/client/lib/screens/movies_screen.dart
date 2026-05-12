import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/movie.dart';
import '../services/api_service.dart';
import 'player_screen.dart';

// Design tokens (shared with home_screen)
class _C {
  static const bg        = Color(0xFF0C0714);
  static const bgCard    = Color(0xFF160B25);
  static const accent    = Color(0xFF9D4EDD);
  static const glow      = Color(0xFFBB86FC);
  static const txt       = Color(0xFFFFFFFF);
  static const txtSub    = Color(0xFFB0AEC8);
  static const border    = Color(0x449D4EDD);
}

class MoviesScreen extends StatefulWidget {
  const MoviesScreen({super.key});

  @override
  State<MoviesScreen> createState() => _MoviesScreenState();
}

class _MoviesScreenState extends State<MoviesScreen> {
  final ApiService _api = ApiService();
  late Future<List<Movie>> _future;

  List<Movie> _all = [];
  List<Movie> _filtered = [];
  String _query = '';
  bool _searchVisible = false;
  final _searchCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<List<Movie>> _load() async {
    final movies = await _api.fetchMovies();
    if (mounted) setState(() { _all = movies; _filtered = movies; });
    return movies;
  }

  void _onSearch(String q) {
    setState(() {
      _query = q;
      _filtered = q.isEmpty
        ? _all
        : _all.where((m) =>
            m.name.toLowerCase().contains(q.toLowerCase()) ||
            (m.group?.toLowerCase().contains(q.toLowerCase()) ?? false),
          ).toList();
    });
  }

  Map<String, List<Movie>> _grouped(List<Movie> movies) {
    final m = <String, List<Movie>>{};
    for (final mv in movies) {
      (m[mv.group ?? 'Autres'] ??= []).add(mv);
    }
    return m;
  }

  void _play(Movie m) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(name: m.name, url: m.url, group: m.group),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _C.bg,
      extendBodyBehindAppBar: true,
      appBar: _buildAppBar(),
      body: FutureBuilder<List<Movie>>(
        future: _future,
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const _LoadingView(label: 'Chargement des films...');
          }
          if (snap.hasError) {
            return _ErrorView(
              message: snap.error.toString(),
              onRetry: () => setState(() { _all = []; _filtered = []; _future = _load(); }),
            );
          }
          if (_all.isEmpty) {
            return const Center(child: Text('Aucun film disponible.', style: TextStyle(color: _C.txtSub)));
          }

          final groups = _grouped(_filtered);
          return CustomScrollView(
            slivers: [
              SliverToBoxAdapter(child: SizedBox(height: MediaQuery.of(context).padding.top + 80)),
              if (_query.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
                    child: Text(
                      'Résultats pour "$_query"  (${_filtered.length})',
                      style: const TextStyle(color: _C.glow, fontSize: 17, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              SliverList(
                delegate: SliverChildBuilderDelegate(
                  (_, i) {
                    final key = groups.keys.elementAt(i);
                    return _GenreRow(
                      title: key,
                      movies: groups[key]!,
                      onTap: _play,
                    );
                  },
                  childCount: groups.length,
                ),
              ),
              const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
            ],
          );
        },
      ),
    );
  }

  PreferredSizeWidget _buildAppBar() {
    return PreferredSize(
      preferredSize: const Size.fromHeight(70),
      child: ClipRect(
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: Container(
            decoration: const BoxDecoration(
              color: Color(0x990C0714),
              border: Border(bottom: BorderSide(color: _C.border, width: 1)),
            ),
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Row(
                  children: [
                    const Text('Films', style: TextStyle(
                      color: _C.accent, fontSize: 22, fontWeight: FontWeight.w900, letterSpacing: -1,
                    )),
                    const Spacer(),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 280),
                      transitionBuilder: (child, anim) => FadeTransition(
                        opacity: anim,
                        child: SizeTransition(sizeFactor: anim, axis: Axis.horizontal, child: child),
                      ),
                      child: _searchVisible
                        ? SizedBox(
                            key: const ValueKey('f'),
                            width: 240, height: 40,
                            child: _SearchField(controller: _searchCtrl, onChanged: _onSearch, hint: 'Titre, genre...'),
                          )
                        : const SizedBox(key: ValueKey('e')),
                    ),
                    const SizedBox(width: 6),
                    _IconBtn(
                      icon: _searchVisible ? Icons.close_rounded : Icons.search_rounded,
                      onTap: () => setState(() {
                        _searchVisible = !_searchVisible;
                        if (!_searchVisible) { _searchCtrl.clear(); _onSearch(''); }
                      }),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Genre Row ────────────────────────────────────────────────────────────────
class _GenreRow extends StatelessWidget {
  final String title;
  final List<Movie> movies;
  final void Function(Movie) onTap;

  // Portrait poster: width 130, height ~195 (3:2 inverted = 2:3)
  static const double _cardW = 130;
  static const double _cardH = 195;
  static const double _rowH  = _cardH + 30; // label below

  const _GenreRow({required this.title, required this.movies, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 10),
          child: Row(children: [
            Text(title, style: const TextStyle(color: _C.txt, fontSize: 16, fontWeight: FontWeight.w700)),
            const SizedBox(width: 8),
            Text('(${movies.length})', style: const TextStyle(color: _C.txtSub, fontSize: 12)),
          ]),
        ),
        SizedBox(
          height: _rowH,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: movies.length,
            itemBuilder: (_, i) => _PosterCard(
              name: movies[i].name,
              cover: movies[i].cover,
              rating: movies[i].rating,
              width: _cardW,
              height: _cardH,
              onTap: () => onTap(movies[i]),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Poster Card (portrait, 2:3) ──────────────────────────────────────────────
class _PosterCard extends StatefulWidget {
  final String name;
  final String? cover;
  final String? rating;
  final double width;
  final double height;
  final VoidCallback onTap;

  const _PosterCard({
    required this.name, this.cover, this.rating,
    required this.width, required this.height, required this.onTap,
  });

  @override
  State<_PosterCard> createState() => _PosterCardState();
}

class _PosterCardState extends State<_PosterCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: widget.width,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            transform: _hovered
              ? (Matrix4.identity()..scale(1.05, 1.05, 1.0))
              : Matrix4.identity(),
            transformAlignment: Alignment.center,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  width: widget.width,
                  height: widget.height,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: _hovered ? _C.accent : Colors.transparent,
                      width: 2,
                    ),
                    boxShadow: _hovered
                      ? [BoxShadow(color: _C.accent.withValues(alpha: 0.45), blurRadius: 16, spreadRadius: 1)]
                      : [],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: _buildCover(),
                  ),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(
                    widget.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _hovered ? _C.glow : _C.txtSub,
                      fontSize: 11,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                if (widget.rating != null && widget.rating!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text(
                      '★ ${widget.rating}',
                      style: const TextStyle(color: Color(0xFFFFD700), fontSize: 10),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCover() {
    if (widget.cover != null && widget.cover!.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: widget.cover!,
        fit: BoxFit.cover,
        placeholder: (_, __) => _shimmer(),
        errorWidget: (_, __, ___) => _fallback(),
      );
    }
    return _fallback();
  }

  Widget _shimmer() => Container(
    color: _C.bgCard,
    child: const Center(
      child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: _C.border)),
    ),
  );

  Widget _fallback() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [Color(0xFF1A0F2E), Color(0xFF2D1B4E)],
      ),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.movie_rounded, color: Color(0x779D4EDD), size: 32),
        const SizedBox(height: 6),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: Text(widget.name, maxLines: 2, overflow: TextOverflow.ellipsis,
            textAlign: TextAlign.center, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 9)),
        ),
      ],
    ),
  );
}

// ─── Shared widgets ───────────────────────────────────────────────────────────
class _IconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) => MouseRegion(
    cursor: SystemMouseCursors.click,
    child: GestureDetector(
      onTap: onTap,
      child: Container(
        width: 36, height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.07),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Icon(icon, color: Colors.white, size: 20),
      ),
    ),
  );
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hint;
  const _SearchField({required this.controller, required this.onChanged, required this.hint});

  @override
  Widget build(BuildContext context) => ClipRRect(
    borderRadius: BorderRadius.circular(20),
    child: BackdropFilter(
      filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
      child: TextField(
        controller: controller,
        autofocus: true,
        onChanged: onChanged,
        style: const TextStyle(color: _C.txt, fontSize: 14),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13),
          prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
          filled: true,
          fillColor: Colors.white.withValues(alpha: 0.09),
          contentPadding: EdgeInsets.zero,
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.accent, width: 1.5)),
        ),
      ),
    ),
  );
}

class _LoadingView extends StatelessWidget {
  final String label;
  const _LoadingView({required this.label});

  @override
  Widget build(BuildContext context) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(color: _C.accent, strokeWidth: 3)),
        const SizedBox(height: 20),
        Text(label, style: const TextStyle(color: _C.txtSub, fontSize: 15)),
      ],
    ),
  );
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, size: 64, color: _C.accent),
          const SizedBox(height: 18),
          const Text('Connexion impossible', style: TextStyle(color: _C.txt, fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          Text(message, style: const TextStyle(color: _C.txtSub, fontSize: 12), textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 28),
          ElevatedButton.icon(
            onPressed: onRetry,
            style: ElevatedButton.styleFrom(backgroundColor: _C.accent, foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Réessayer', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    ),
  );
}
