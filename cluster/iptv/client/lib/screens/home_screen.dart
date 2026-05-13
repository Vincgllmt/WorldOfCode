import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/channel.dart';
import '../services/api_service.dart';
import '../services/favorites_service.dart';
import '../widgets/genre_drawer.dart';
import 'player_screen.dart';

// ─── Design tokens ────────────────────────────────────────────────────────────
class _C {
  static const bg        = Color(0xFF0C0714);
  static const bgCard    = Color(0xFF160B25);
  static const accent    = Color(0xFF9D4EDD);
  static const accentAlt = Color(0xFF8A2BE2);
  static const glow      = Color(0xFFBB86FC);
  static const txt       = Color(0xFFFFFFFF);
  static const txtSub    = Color(0xFFB0AEC8);
  static const border    = Color(0x449D4EDD);
  static const liveDot   = Color(0xFFFF4757);
}

// ─── Home Screen ─────────────────────────────────────────────────────────────
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final ApiService _api = ApiService();
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late Future<List<Channel>> _future;

  List<Channel> _allChannels = [];
  List<Channel> _filtered = [];
  Set<String> _favorites = {};
  String  _query         = '';
  String? _selectedGenre;
  bool    _searchVisible = false;
  final   _searchCtrl    = TextEditingController();

  @override
  void initState() {
    super.initState();
    _future = _loadChannels();
    FavoritesService.loadFavorites().then((favs) {
      if (mounted) setState(() => _favorites = favs);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<List<Channel>> _loadChannels() async {
    final channels = await _api.fetchChannels();
    if (mounted) setState(() { _allChannels = channels; _filtered = channels; });
    return channels;
  }

  void _applyFilters() {
    setState(() {
      var result = _allChannels;
      if (_selectedGenre != null) {
        result = result.where((c) => (c.group ?? 'Autres') == _selectedGenre).toList();
      }
      if (_query.isNotEmpty) {
        final lq = _query.toLowerCase();
        result = result.where((c) =>
          c.name.toLowerCase().contains(lq) ||
          (c.group?.toLowerCase().contains(lq) ?? false),
        ).toList();
      }
      _filtered = result;
    });
  }

  void _onSearch(String q) {
    _query = q;
    _applyFilters();
  }

  void _onGenreSelect(String? genre) {
    _selectedGenre = genre;
    _applyFilters();
  }

  List<String> get _genres {
    final set = <String>{};
    for (final c in _allChannels) { set.add(c.group ?? 'Autres'); }
    return set.toList()..sort();
  }

  Map<String, int> get _genreCounts {
    final map = <String, int>{};
    for (final c in _allChannels) {
      final g = c.group ?? 'Autres';
      map[g] = (map[g] ?? 0) + 1;
    }
    return map;
  }

  void _toggleFavorite(Channel ch) {
    setState(() {
      if (_favorites.contains(ch.url)) {
        _favorites.remove(ch.url);
      } else {
        _favorites.add(ch.url);
      }
    });
    FavoritesService.saveFavorites(_favorites);
  }

  Map<String, List<Channel>> _grouped(List<Channel> channels) {
    final Map<String, List<Channel>> m = {};
    for (final ch in channels) {
      (m[ch.group ?? 'Autres'] ??= []).add(ch);
    }
    return m;
  }

  void _openPlayer(Channel ch) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PlayerScreen(name: ch.name, url: ch.url, group: ch.group)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      backgroundColor: _C.bg,
      extendBodyBehindAppBar: true,
      drawer: GenreDrawer(
        title: 'Live',
        genres: _genres,
        counts: _genreCounts,
        selected: _selectedGenre,
        onSelect: _onGenreSelect,
      ),
      appBar: _AppBar(
        searchVisible: _searchVisible,
        searchCtrl: _searchCtrl,
        onSearchChanged: _onSearch,
        onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
        onToggleSearch: () => setState(() {
          _searchVisible = !_searchVisible;
          if (!_searchVisible) {
            _searchCtrl.clear();
            _onSearch('');
          }
        }),
      ),
      body: FutureBuilder<List<Channel>>(
        future: _future,
        builder: (ctx, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const _LoadingView();
          }
          if (snap.hasError) {
            return _ErrorView(
              message: snap.error.toString(),
              onRetry: () => setState(() {
                _allChannels = [];
                _filtered = [];
                _future = _loadChannels();
              }),
            );
          }
          if (_allChannels.isEmpty) {
            return const Center(
              child: Text('Aucune chaîne disponible.', style: TextStyle(color: _C.txtSub)),
            );
          }

          final groups = _grouped(_filtered);
          final favChannels = _selectedGenre == null
            ? _allChannels.where((c) => _favorites.contains(c.url)).toList()
            : <Channel>[];

          return CustomScrollView(
            slivers: [
              // Hero banner — hidden while searching or filtering
              if (_query.isEmpty && _selectedGenre == null)
                SliverToBoxAdapter(
                  child: _HeroBanner(channel: _allChannels.first, onPlay: _openPlayer),
                ),

              // Spacer when no hero
              if (_query.isNotEmpty || _selectedGenre != null)
                const SliverToBoxAdapter(child: SizedBox(height: 110)),

              // Active genre badge
              if (_selectedGenre != null)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(24, 0, 24, 4),
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0x339D4EDD),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _C.accent),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          Text(_selectedGenre!, style: const TextStyle(color: _C.glow, fontSize: 13, fontWeight: FontWeight.w600)),
                          const SizedBox(width: 8),
                          GestureDetector(
                            onTap: () { _selectedGenre = null; _applyFilters(); },
                            child: const Icon(Icons.close_rounded, color: _C.glow, size: 14),
                          ),
                        ]),
                      ),
                      const SizedBox(width: 10),
                      Text('${_filtered.length} chaîne${_filtered.length > 1 ? 's' : ''}',
                        style: const TextStyle(color: _C.txtSub, fontSize: 12)),
                    ]),
                  ),
                ),

              // Search result label
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

              // Favorites row
              if (_query.isEmpty && favChannels.isNotEmpty)
                SliverToBoxAdapter(
                  child: _CategoryRow(
                    title: '★  Mes Favoris',
                    channels: favChannels,
                    favorites: _favorites,
                    onTap: _openPlayer,
                    onFav: _toggleFavorite,
                    isAccent: true,
                  ),
                ),

              // Category rows
              if (_filtered.isEmpty && _allChannels.isNotEmpty)
                const SliverFillRemaining(
                  child: Center(child: Text('Aucun résultat.', style: TextStyle(color: _C.txtSub))),
                )
              else
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (ctx, i) {
                      final key = groups.keys.elementAt(i);
                      return _CategoryRow(
                        title: key,
                        channels: groups[key]!,
                        favorites: _favorites,
                        onTap: _openPlayer,
                        onFav: _toggleFavorite,
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
}

// ─── App Bar (glassmorphism) ──────────────────────────────────────────────────
class _AppBar extends StatelessWidget implements PreferredSizeWidget {
  final bool searchVisible;
  final TextEditingController searchCtrl;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onToggleSearch;
  final VoidCallback onOpenDrawer;

  const _AppBar({
    required this.searchVisible,
    required this.searchCtrl,
    required this.onSearchChanged,
    required this.onToggleSearch,
    required this.onOpenDrawer,
  });

  @override
  Size get preferredSize => const Size.fromHeight(70);

  @override
  Widget build(BuildContext context) {
    return ClipRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: const BoxDecoration(
            color: Color(0x990C0714),
            border: Border(bottom: BorderSide(color: _C.border, width: 1)),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: Row(
                children: [
                  // Drawer toggle
                  _AppBarIcon(icon: Icons.menu_rounded, onTap: onOpenDrawer),
                  const SizedBox(width: 8),

                  // Brand
                  const Text(
                    'WOC TV',
                    style: TextStyle(
                      color: _C.accent,
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                      letterSpacing: -1,
                    ),
                  ),
                  const Spacer(),

                  // Expandable search field
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 280),
                    transitionBuilder: (child, anim) => FadeTransition(
                      opacity: anim,
                      child: SizeTransition(sizeFactor: anim, axis: Axis.horizontal, child: child),
                    ),
                    child: searchVisible
                      ? SizedBox(
                          key: const ValueKey('field'),
                          width: 240,
                          height: 40,
                          child: _GlassSearchField(
                            controller: searchCtrl,
                            onChanged: onSearchChanged,
                          ),
                        )
                      : const SizedBox(key: ValueKey('empty')),
                  ),

                  const SizedBox(width: 6),

                  // Search toggle
                  _AppBarIcon(
                    icon: searchVisible ? Icons.close_rounded : Icons.search_rounded,
                    onTap: onToggleSearch,
                  ),
                  const SizedBox(width: 4),

                  // Avatar placeholder
                  CircleAvatar(
                    radius: 16,
                    backgroundColor: _C.accentAlt,
                    child: const Icon(Icons.person_rounded, size: 18, color: Colors.white),
                  ),
                  const SizedBox(width: 4),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _AppBarIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _AppBarIcon({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.07),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: Colors.white, size: 20),
        ),
      ),
    );
  }
}

class _GlassSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _GlassSearchField({required this.controller, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: TextField(
          controller: controller,
          autofocus: true,
          onChanged: onChanged,
          style: const TextStyle(color: _C.txt, fontSize: 14),
          decoration: InputDecoration(
            hintText: 'Chaîne, catégorie...',
            hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13),
            prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
            filled: true,
            fillColor: Colors.white.withValues(alpha: 0.09),
            contentPadding: EdgeInsets.zero,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: _C.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: _C.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(20),
              borderSide: const BorderSide(color: _C.accent, width: 1.5),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Hero Banner ─────────────────────────────────────────────────────────────
class _HeroBanner extends StatelessWidget {
  final Channel channel;
  final void Function(Channel) onPlay;
  const _HeroBanner({required this.channel, required this.onPlay});

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // Background image
        SizedBox(
          height: 520,
          width: double.infinity,
          child: _buildBg(),
        ),

        // Bottom purple gradient
        Container(
          height: 520,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [
                Color(0x660C0714),
                Color(0x000C0714),
                Color(0xCC0C0714),
                Color(0xFF0C0714),
              ],
              stops: [0.0, 0.35, 0.72, 1.0],
            ),
          ),
        ),

        // Left vignette
        Container(
          height: 520,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
              colors: [Color(0xDD0C0714), Colors.transparent],
              stops: [0.0, 0.65],
            ),
          ),
        ),

        // Content
        Positioned(
          bottom: 48,
          left: 36,
          right: 180,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Live badge
              _LiveBadge(label: channel.group ?? 'EN DIRECT'),
              const SizedBox(height: 16),

              // Channel name
              Text(
                channel.name.toUpperCase(),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 42,
                  fontWeight: FontWeight.w900,
                  letterSpacing: -1.5,
                  height: 1.05,
                ),
              ),
              const SizedBox(height: 12),

              // Subtitle line
              Row(
                children: [
                  const Icon(Icons.circle, size: 8, color: _C.liveDot),
                  const SizedBox(width: 6),
                  const Text('Diffusion en direct', style: TextStyle(color: _C.glow, fontSize: 14)),
                ],
              ),
              const SizedBox(height: 28),

              // CTA buttons
              Row(
                children: [
                  _HeroButton(
                    label: 'Lecture',
                    icon: Icons.play_arrow_rounded,
                    primary: true,
                    onTap: () => onPlay(channel),
                  ),
                  const SizedBox(width: 12),
                  _HeroButton(
                    label: "Plus d'infos",
                    icon: Icons.info_outline_rounded,
                    primary: false,
                    onTap: () {},
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildBg() {
    final logo = channel.logo;
    if (logo != null && logo.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: logo,
        fit: BoxFit.cover,
        alignment: Alignment.topCenter,
        placeholder: (_, __) => _fallbackBg(),
        errorWidget: (_, __, ___) => _fallbackBg(),
      );
    }
    return _fallbackBg();
  }

  Widget _fallbackBg() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2D1B4E), Color(0xFF0C0714)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.live_tv_rounded, size: 100, color: Color(0x449D4EDD)),
      ),
    );
  }
}

class _LiveBadge extends StatelessWidget {
  final String label;
  const _LiveBadge({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: _C.accent.withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(5),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.circle, size: 7, color: Colors.white),
          const SizedBox(width: 5),
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: Colors.white,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.4,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroButton extends StatefulWidget {
  final String label;
  final IconData icon;
  final bool primary;
  final VoidCallback onTap;
  const _HeroButton({required this.label, required this.icon, required this.primary, required this.onTap});

  @override
  State<_HeroButton> createState() => _HeroButtonState();
}

class _HeroButtonState extends State<_HeroButton> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 13),
          decoration: BoxDecoration(
            color: widget.primary
              ? (_hovered ? _C.glow : _C.accent)
              : Colors.white.withValues(alpha: _hovered ? 0.22 : 0.13),
            borderRadius: BorderRadius.circular(6),
            border: widget.primary
              ? null
              : Border.all(color: Colors.white.withValues(alpha: 0.3)),
            boxShadow: widget.primary && _hovered
              ? [BoxShadow(color: _C.accent.withValues(alpha: 0.6), blurRadius: 16, spreadRadius: 1)]
              : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(widget.icon, color: Colors.white, size: 22),
              const SizedBox(width: 8),
              Text(
                widget.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Category Row ─────────────────────────────────────────────────────────────
class _CategoryRow extends StatelessWidget {
  final String title;
  final List<Channel> channels;
  final Set<String> favorites;
  final void Function(Channel) onTap;
  final void Function(Channel) onFav;
  final bool isAccent;

  const _CategoryRow({
    required this.title,
    required this.channels,
    required this.favorites,
    required this.onTap,
    required this.onFav,
    this.isAccent = false,
  });

  // Row height = card image (16:9 of 248px width = 139.5) + label (18) + spacing (16)
  static const double _rowHeight = 185;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 10),
          child: Row(
            children: [
              if (isAccent) ...[
                Container(
                  width: 3,
                  height: 18,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: _C.accent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ],
              Text(
                title,
                style: TextStyle(
                  color: isAccent ? _C.glow : _C.txt,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                  letterSpacing: -0.2,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '(${channels.length})',
                style: const TextStyle(color: _C.txtSub, fontSize: 12),
              ),
            ],
          ),
        ),
        SizedBox(
          height: _rowHeight,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: channels.length,
            itemBuilder: (_, i) => _ChannelCard(
              channel: channels[i],
              isFavorite: favorites.contains(channels[i].url),
              onTap: () => onTap(channels[i]),
              onFav: () => onFav(channels[i]),
            ),
          ),
        ),
      ],
    );
  }
}

// ─── Channel Card ─────────────────────────────────────────────────────────────
class _ChannelCard extends StatefulWidget {
  final Channel channel;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onFav;

  const _ChannelCard({
    required this.channel,
    required this.isFavorite,
    required this.onTap,
    required this.onFav,
  });

  @override
  State<_ChannelCard> createState() => _ChannelCardState();
}

class _ChannelCardState extends State<_ChannelCard> {
  bool _hovered = false;

  static const double _cardW = 248;

  @override
  Widget build(BuildContext context) {
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit: (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: _cardW,
          margin: const EdgeInsets.symmetric(horizontal: 8),
          // Use transform + AnimatedContainer for the hover pop
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
                // 16:9 thumbnail
                Stack(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _hovered ? _C.accent : Colors.transparent,
                          width: 2,
                        ),
                        boxShadow: _hovered
                          ? [BoxShadow(color: _C.accent.withValues(alpha: 0.45), blurRadius: 18, spreadRadius: 1)]
                          : [],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(10),
                        child: AspectRatio(
                          aspectRatio: 16 / 9,
                          child: _buildThumbnail(),
                        ),
                      ),
                    ),

                    // Favorite star
                    Positioned(
                      top: 7,
                      right: 7,
                      child: AnimatedOpacity(
                        opacity: _hovered || widget.isFavorite ? 1.0 : 0.0,
                        duration: const Duration(milliseconds: 200),
                        child: GestureDetector(
                          onTap: widget.onFav,
                          behavior: HitTestBehavior.opaque,
                          child: Container(
                            padding: const EdgeInsets.all(5),
                            decoration: BoxDecoration(
                              color: Colors.black.withValues(alpha: 0.6),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              widget.isFavorite ? Icons.star_rounded : Icons.star_border_rounded,
                              color: widget.isFavorite ? const Color(0xFFFFD700) : Colors.white,
                              size: 15,
                            ),
                          ),
                        ),
                      ),
                    ),

                    // Live badge
                    Positioned(
                      bottom: 7,
                      left: 7,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                        decoration: BoxDecoration(
                          color: _C.accent.withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.circle, size: 5, color: Colors.white),
                            SizedBox(width: 3),
                            Text(
                              'LIVE',
                              style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1.2),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),

                // Channel name
                const SizedBox(height: 7),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(
                    widget.channel.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: _hovered ? _C.glow : _C.txtSub,
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildThumbnail() {
    final logo = widget.channel.logo;
    if (logo != null && logo.isNotEmpty) {
      return CachedNetworkImage(
        imageUrl: logo,
        fit: BoxFit.cover,
        placeholder: (_, __) => _shimmer(),
        errorWidget: (_, __, ___) => _fallback(),
      );
    }
    return _fallback();
  }

  Widget _shimmer() {
    return Container(
      color: _C.bgCard,
      child: const Center(
        child: SizedBox(
          width: 18,
          height: 18,
          child: CircularProgressIndicator(strokeWidth: 2, color: _C.border),
        ),
      ),
    );
  }

  Widget _fallback() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A0F2E), Color(0xFF2D1B4E)],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.live_tv_rounded, color: Color(0x779D4EDD), size: 28),
          const SizedBox(height: 5),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 8),
            child: Text(
              widget.channel.name,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 10),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Loading / Error views ────────────────────────────────────────────────────
class _LoadingView extends StatelessWidget {
  const _LoadingView();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            width: 48,
            height: 48,
            child: CircularProgressIndicator(
              color: _C.accent,
              strokeWidth: 3,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Chargement des chaînes...',
            style: TextStyle(color: _C.txtSub, fontSize: 15),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.wifi_off_rounded, size: 64, color: _C.accent),
            const SizedBox(height: 18),
            const Text(
              'Connexion impossible',
              style: TextStyle(color: _C.txt, fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            Text(
              message,
              style: const TextStyle(color: _C.txtSub, fontSize: 12),
              textAlign: TextAlign.center,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 28),
            ElevatedButton.icon(
              onPressed: onRetry,
              style: ElevatedButton.styleFrom(
                backgroundColor: _C.accent,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Réessayer', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ],
        ),
      ),
    );
  }
}
