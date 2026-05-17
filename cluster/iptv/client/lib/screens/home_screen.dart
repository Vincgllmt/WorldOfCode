import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/channel.dart';
import '../services/api_service.dart';
import '../services/credentials_service.dart';
import '../utils/text_utils.dart';
import '../services/favorites_service.dart';
import '../services/genre_favorites_service.dart';
import '../services/language_service.dart';
import '../services/settings_service.dart';
import '../widgets/genre_drawer.dart';
import '../widgets/brand_logo.dart';
import 'player_screen.dart';
import 'setup_screen.dart';

// ─── Design tokens ────────────────────────────────────────────────────────────
class _C {
  static const bg        = Color(0xFF160B25);
  static const bgCard    = Color(0xFF1F1235);
  static const accent    = Color(0xFF9D4EDD);
  static const accentAlt = Color(0xFF8A2BE2);
  static const glow      = Color(0xFFBB86FC);
  static const txt       = Color(0xFFFFFFFF);
  static const txtSub    = Color(0xFFB0AEC8);
  static const border    = Color(0x449D4EDD);
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
  Set<String> _favGenres    = {};
  String  _query         = '';
  String? _selectedGenre;
  bool    _searchVisible = false;
  final   _searchCtrl    = TextEditingController();

  Map<String, List<Channel>>? _cachedGroups;
  List<String>? _cachedSortedKeys;

  @override
  void initState() {
    super.initState();
    _future = _loadChannels();
    FavoritesService.loadFavorites().then((favs) {
      if (mounted) setState(() => _favorites = favs);
    });
    GenreFavoritesService.load('live').then((favs) {
      if (mounted) setState(() => _favGenres = favs);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<List<Channel>> _loadChannels({bool force = false}) async {
    final channels = await _api.fetchChannels(forceRefresh: force);
    if (mounted) setState(() { _allChannels = channels; _filtered = channels; });
    return channels;
  }

  void _applyFilters() {
    setState(() {
      var result = _allChannels;
      if (_selectedGenre != null) {
        result = result.where((c) => (c.group ?? lang.t('other')) == _selectedGenre).toList();
      }
      if (_query.isNotEmpty) {
        final lq = normalize(_query);
        result = result.where((c) =>
          normalize(c.name).contains(lq) ||
          normalize(c.group ?? '').contains(lq),
        ).toList();
      }
      _filtered = result;
      _cachedGroups = null;
      _cachedSortedKeys = null;
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
    for (final c in _allChannels) { set.add(c.group ?? lang.t('other')); }
    return set.toList()..sort();
  }

  Map<String, int> get _genreCounts {
    final map = <String, int>{};
    for (final c in _allChannels) {
      final g = c.group ?? lang.t('other');
      map[g] = (map[g] ?? 0) + 1;
    }
    return map;
  }

  void _toggleFavGenre(String genre) {
    setState(() {
      if (_favGenres.contains(genre)) { _favGenres.remove(genre); } else { _favGenres.add(genre); }
      _cachedSortedKeys = null;
    });
    GenreFavoritesService.save('live', _favGenres);
  }

  void _toggleFavorite(Channel ch) {
    setState(() {
      if (_favorites.contains(ch.url)) { _favorites.remove(ch.url); } else { _favorites.add(ch.url); }
    });
    FavoritesService.saveFavorites(_favorites);
  }

  Map<String, List<Channel>> _grouped(List<Channel> channels) {
    if (_cachedGroups != null) return _cachedGroups!;
    final Map<String, List<Channel>> m = {};
    for (final ch in channels) {
      (m[ch.group ?? lang.t('other')] ??= []).add(ch);
    }
    _cachedGroups = m;
    return m;
  }

  List<String> _sortedKeys(Map<String, List<Channel>> groups) {
    if (_cachedSortedKeys != null) return _cachedSortedKeys!;
    final fav   = groups.keys.where((k) =>  _favGenres.contains(k)).toList()..sort();
    final other = groups.keys.where((k) => !_favGenres.contains(k)).toList()..sort();
    _cachedSortedKeys = [...fav, ...other];
    return _cachedSortedKeys!;
  }

  void _openPlayer(Channel ch) {
    Navigator.push(context, MaterialPageRoute(
      builder: (_) => PlayerScreen(name: ch.name, url: ch.url, group: ch.group, type: 'live'),
    ));
  }

  Future<void> _openSettings() async {
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF160B25),
        title: Text(lang.t('logout_title'), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(lang.t('language'), style: const TextStyle(color: _C.glow, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                _LangBtn(label: 'FR', active: lang.locale.value == 'fr', onTap: () { lang.setLanguage('fr'); Navigator.pop(ctx); }),
                const SizedBox(width: 12),
                _LangBtn(label: 'EN', active: lang.locale.value == 'en', onTap: () { lang.setLanguage('en'); Navigator.pop(ctx); }),
              ],
            ),
            const SizedBox(height: 24),
            const Divider(color: _C.border, height: 1),
            const SizedBox(height: 24),
            Text(lang.t('logout_confirm'), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(lang.t('logout_desc'), style: const TextStyle(color: _C.txtSub, fontSize: 12, height: 1.5)),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'), style: const TextStyle(color: _C.txtSub))),
          TextButton(
            onPressed: () {
              Navigator.pop(ctx);
              _logout();
            },
            child: Text(lang.t('logout'), style: const TextStyle(color: Color(0xFFCF6679), fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Future<void> _logout() async {
    await CredentialsService.clear();
    ApiService.invalidateCache();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const SetupScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: lang.locale,
      builder: (context, locale, _) {
        return ValueListenableBuilder<ViewMode>(
          valueListenable: settings.viewMode,
          builder: (context, viewMode, _) {
            return Scaffold(
              key: _scaffoldKey,
              backgroundColor: _C.bg,
              extendBodyBehindAppBar: true,
              drawer: GenreDrawer(
                title: lang.t('live'), genres: _genres, counts: _genreCounts, selected: _selectedGenre,
                favGenres: _favGenres, onSelect: _onGenreSelect, onToggleFav: _toggleFavGenre,
              ),
              appBar: _AppBar(
                searchVisible: _searchVisible, viewMode: viewMode, searchCtrl: _searchCtrl,
                onSearchChanged: _onSearch, onOpenDrawer: () => _scaffoldKey.currentState?.openDrawer(),
                onAccount: _openSettings, onToggleView: (v) => settings.setViewMode(v),
                onToggleSearch: () => setState(() {
                  _searchVisible = !_searchVisible;
                  if (!_searchVisible) { _searchCtrl.clear(); _onSearch(''); }
                }),
              ),
              body: FutureBuilder<List<Channel>>(
                future: _future,
                builder: (ctx, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const _LoadingView();
                  }
                  if (snap.hasError) {
                    return _ErrorView(message: snap.error.toString(), onRetry: () => setState(() {
                      _allChannels = []; _filtered = []; _future = _loadChannels();
                    }));
                  }
                  if (_allChannels.isEmpty) {
                    return Center(child: Text(lang.t('no_connection'), style: const TextStyle(color: _C.txtSub)));
                  }

                  final groups = _grouped(_filtered);
                  final sortedKeys = _sortedKeys(groups);
                  final favChannels = _selectedGenre == null ? _allChannels.where((c) => _favorites.contains(c.url)).toList() : <Channel>[];

                  return RefreshIndicator(
                    onRefresh: () => _loadChannels(force: true),
                    color: _C.accent,
                    backgroundColor: _C.bgCard,
                    child: CustomScrollView(
                      slivers: [
                        SliverToBoxAdapter(child: SizedBox(height: MediaQuery.of(context).padding.top + 90)),
                        if (_query.isNotEmpty)
                          ..._buildGridSlivers(_filtered, viewMode, showTitle: true, title: '${lang.t('results_for')} "$_query"')
                        else if (viewMode == ViewMode.themes && _selectedGenre == null)
                          _buildThemesGrid(groups, sortedKeys)
                        else if (_selectedGenre != null)
                          ..._buildGridSlivers(groups[_selectedGenre]!, viewMode, showTitle: false)
                        else
                          for (final key in sortedKeys)
                            SliverToBoxAdapter(child: _CategoryRow(
                              title: key, channels: groups[key]!, favorites: _favorites,
                              onTap: _openPlayer, onFav: _toggleFavorite,
                              onTitleTap: () => setState(() => _selectedGenre = key),
                              isFavGenre: _favGenres.contains(key),
                              onToggleFavGenre: () => _toggleFavGenre(key),
                              viewMode: viewMode,
                            )),
                        const SliverPadding(padding: EdgeInsets.only(bottom: 100)),
                      ],
                    ),
                  );
                },
              ),
            );
          }
        );
      }
    );
  }

  List<Widget> _buildGridSlivers(List<Channel> channels, ViewMode viewMode, {bool showTitle = false, String? title}) {
    double maxExtent = 270;
    double aspectRatio = 264 / 185;
    switch (viewMode) {
      case ViewMode.gridSmall: maxExtent = 180; break;
      case ViewMode.gridMedium: maxExtent = 270; break;
      case ViewMode.gridLarge: maxExtent = 380; break;
      default: maxExtent = 270;
    }
    return [
      if (showTitle && title != null)
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(24, 32, 24, 12), child: Row(children: [
          Container(width: 4, height: 24, decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2))),
          const SizedBox(width: 12),
          Text(title.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
          const SizedBox(width: 12),
          Text('(${channels.length})', style: const TextStyle(color: _C.txtSub, fontSize: 13)),
        ]))),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: maxExtent, mainAxisSpacing: 16, crossAxisSpacing: 8, childAspectRatio: aspectRatio),
          delegate: SliverChildBuilderDelegate((_, i) => _ChannelCard(
            channel: channels[i], isFavorite: _favorites.contains(channels[i].url),
            onTap: () => _openPlayer(channels[i]), onFav: () => _toggleFavorite(channels[i]),
          ), childCount: channels.length),
        ),
      ),
    ];
  }

  Widget _buildThemesGrid(Map<String, List<Channel>> groups, List<String> sortedKeys) {
    final width = MediaQuery.of(context).size.width;
    final maxExtent = width < 600 ? width : 350.0;

    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: maxExtent, 
          mainAxisSpacing: 12, 
          crossAxisSpacing: 16, 
          childAspectRatio: width < 600 ? 3.5 / 1 : 2.8 / 1
        ),
        delegate: SliverChildBuilderDelegate((_, i) {
          final key = sortedKeys[i];
          return _CategoryCard(
            title: key, count: groups[key]!.length, isFav: _favGenres.contains(key),
            onTap: () => setState(() => _selectedGenre = key),
          );
        }, childCount: sortedKeys.length),
      ),
    );
  }
}

class _AppBar extends StatelessWidget implements PreferredSizeWidget {
  final bool searchVisible;
  final ViewMode viewMode;
  final TextEditingController searchCtrl;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onToggleSearch;
  final ValueChanged<ViewMode> onToggleView;
  final VoidCallback onOpenDrawer;
  final VoidCallback onAccount;

  const _AppBar({
    required this.searchVisible, required this.viewMode, required this.searchCtrl,
    required this.onSearchChanged, required this.onToggleSearch, required this.onToggleView,
    required this.onOpenDrawer, required this.onAccount,
  });

  @override
  Size get preferredSize => const Size.fromHeight(70);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(color: Color(0xF00C0714), border: Border(bottom: BorderSide(color: _C.border, width: 1))),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(children: [
            _AppBarIcon(icon: Icons.menu_rounded, onTap: onOpenDrawer),
            const SizedBox(width: 8),
            const BrandLogo(fontSize: 22, showSubtitle: false),
            const Spacer(),
            AnimatedSwitcher(
              duration: const Duration(milliseconds: 280),
              transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: SizeTransition(sizeFactor: anim, axis: Axis.horizontal, child: child)),
              child: searchVisible ? SizedBox(key: const ValueKey('field'), width: 200, height: 40, child: _GlassSearchField(controller: searchCtrl, onChanged: onSearchChanged)) : const SizedBox(key: ValueKey('empty')),
            ),
            const SizedBox(width: 6),
            _AppBarIcon(icon: searchVisible ? Icons.close_rounded : Icons.search_rounded, onTap: onToggleSearch),
            const SizedBox(width: 4),
            PopupMenuButton<ViewMode>(
              icon: const Icon(Icons.dashboard_customize_rounded, color: Colors.white, size: 20),
              tooltip: lang.t('view_mode'), color: const Color(0xFF160B25), offset: const Offset(0, 50),
              onSelected: onToggleView,
              itemBuilder: (_) => [
                _buildPopupItem(context, ViewMode.themes, Icons.list_alt_rounded, lang.t('view_themes')),
                _buildPopupItem(context, ViewMode.gridSmall, Icons.grid_view_rounded, lang.t('view_grid_small')),
                _buildPopupItem(context, ViewMode.gridMedium, Icons.grid_view_rounded, lang.t('view_grid_medium')),
                _buildPopupItem(context, ViewMode.gridLarge, Icons.grid_view_rounded, lang.t('view_grid_large')),
              ],
            ),
            const SizedBox(width: 4),
            GestureDetector(
              onTap: onAccount,
              child: MouseRegion(cursor: SystemMouseCursors.click, child: CircleAvatar(radius: 16, backgroundColor: _C.accentAlt, child: const Icon(Icons.person_rounded, size: 18, color: Colors.white))),
            ),
            const SizedBox(width: 4),
          ]),
        ),
      ),
    );
  }

  PopupMenuItem<ViewMode> _buildPopupItem(BuildContext context, ViewMode v, IconData icon, String label) {
    final selected = viewMode == v;
    return PopupMenuItem(
      value: v,
      child: Row(children: [
        Icon(icon, size: 18, color: selected ? _C.accent : Colors.white70),
        const SizedBox(width: 12),
        Text(label, style: TextStyle(color: selected ? _C.accent : Colors.white, fontSize: 14, fontWeight: selected ? FontWeight.w700 : FontWeight.normal)),
      ]),
    );
  }
}

class _AppBarIcon extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _AppBarIcon({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => MouseRegion(cursor: SystemMouseCursors.click, child: GestureDetector(onTap: onTap, child: Container(width: 36, height: 36, decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(8)), child: Icon(icon, color: Colors.white, size: 20))));
}

class _GlassSearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  const _GlassSearchField({required this.controller, required this.onChanged});
  @override
  Widget build(BuildContext context) => TextField(
    controller: controller, autofocus: true, onChanged: onChanged, style: const TextStyle(color: _C.txt, fontSize: 14),
    decoration: InputDecoration(
      hintText: lang.t('search_hint_live'), hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13), prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
      filled: true, fillColor: const Color(0xFF1A0F2E), contentPadding: EdgeInsets.zero,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.accent, width: 1.5)),
    ),
  );
}

class _CategoryRow extends StatelessWidget {
  final String title;
  final List<Channel> channels;
  final Set<String> favorites;
  final void Function(Channel) onTap;
  final void Function(Channel) onFav;
  final bool isAccent;
  final bool isFavGenre;
  final VoidCallback? onToggleFavGenre;
  final VoidCallback? onTitleTap;
  final ViewMode viewMode;

  const _CategoryRow({required this.title, required this.channels, required this.favorites, required this.onTap, required this.onFav, this.isAccent = false, this.isFavGenre = false, this.onToggleFavGenre, this.onTitleTap, this.viewMode = ViewMode.gridMedium});

  @override
  Widget build(BuildContext context) {
    double rowHeight = 185;
    if (viewMode == ViewMode.gridSmall) rowHeight = 125;
    if (viewMode == ViewMode.gridLarge) rowHeight = 265;

    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(24, 28, 12, 10), child: Row(children: [
        if (isAccent) Container(width: 3, height: 18, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2))),
        Expanded(child: GestureDetector(onTap: onTitleTap, child: Row(children: [
          Flexible(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: isAccent ? _C.glow : _C.txt, fontSize: 17, fontWeight: FontWeight.w700, letterSpacing: -0.2))),
          const SizedBox(width: 8),
          Text('(${channels.length})', style: const TextStyle(color: _C.txtSub, fontSize: 12)),
          if (onTitleTap != null) ...[const SizedBox(width: 4), Icon(Icons.chevron_right_rounded, size: 14, color: _C.txtSub.withValues(alpha: 0.4))],
        ]))),
        if (onToggleFavGenre != null) GestureDetector(onTap: onToggleFavGenre, child: Padding(padding: const EdgeInsets.all(8), child: Icon(isFavGenre ? Icons.bookmark_rounded : Icons.bookmark_border_rounded, size: 18, color: isFavGenre ? _C.accent : _C.txtSub.withValues(alpha: 0.35)))),
      ])),
      SizedBox(height: rowHeight, child: ListView.builder(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: channels.length, itemBuilder: (_, i) => RepaintBoundary(child: _ChannelCard(channel: channels[i], isFavorite: favorites.contains(channels[i].url), onTap: () => onTap(channels[i]), onFav: () => onFav(channels[i]), viewMode: viewMode)))),
    ]);
  }
}

class _ChannelCard extends StatefulWidget {
  final Channel channel;
  final bool isFavorite;
  final VoidCallback onTap;
  final VoidCallback onFav;
  final ViewMode viewMode;
  const _ChannelCard({required this.channel, required this.isFavorite, required this.onTap, required this.onFav, this.viewMode = ViewMode.gridMedium});
  @override
  State<_ChannelCard> createState() => _ChannelCardState();
}

class _ChannelCardState extends State<_ChannelCard> {
  bool _hovered = false;
  @override
  Widget build(BuildContext context) {
    double w = 248;
    if (widget.viewMode == ViewMode.gridSmall) w = 160;
    if (widget.viewMode == ViewMode.gridLarge) w = 380;

    return MouseRegion(cursor: SystemMouseCursors.click, onEnter: (_) => setState(() => _hovered = true), onExit: (_) => setState(() => _hovered = false), child: GestureDetector(onTap: widget.onTap, child: Container(width: w, margin: const EdgeInsets.symmetric(horizontal: 8), child: AnimatedContainer(duration: const Duration(milliseconds: 200), curve: Curves.easeOut, transform: _hovered ? (Matrix4.identity()..scale(1.05, 1.05, 1.0)) : Matrix4.identity(), transformAlignment: Alignment.center, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Stack(children: [
        AnimatedContainer(duration: const Duration(milliseconds: 200), decoration: BoxDecoration(borderRadius: BorderRadius.circular(10), border: Border.all(color: _hovered ? _C.accent : Colors.transparent, width: 2), boxShadow: _hovered ? [BoxShadow(color: _C.accent.withValues(alpha: 0.45), blurRadius: 18, spreadRadius: 1)] : []), child: ClipRRect(borderRadius: BorderRadius.circular(10), child: AspectRatio(aspectRatio: 16 / 9, child: _buildThumbnail()))),
        Positioned(top: 7, right: 7, child: AnimatedOpacity(opacity: _hovered || widget.isFavorite ? 1.0 : 0.0, duration: const Duration(milliseconds: 200), child: GestureDetector(onTap: widget.onFav, behavior: HitTestBehavior.opaque, child: Container(padding: const EdgeInsets.all(5), decoration: BoxDecoration(color: Colors.black.withValues(alpha: 0.6), shape: BoxShape.circle), child: Icon(widget.isFavorite ? Icons.star_rounded : Icons.star_border_rounded, color: widget.isFavorite ? const Color(0xFFFFD700) : Colors.white, size: 15))))),
        Positioned(bottom: 7, left: 7, child: Container(padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3), decoration: BoxDecoration(color: _C.accent.withValues(alpha: 0.8), borderRadius: BorderRadius.circular(4)), child: const Row(mainAxisSize: MainAxisSize.min, children: [Icon(Icons.circle, size: 5, color: Colors.white), SizedBox(width: 3), Text('LIVE', style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1.2))]))),
      ]),
      const SizedBox(height: 7),
      Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: Text(widget.channel.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: _hovered ? _C.glow : _C.txtSub, fontSize: 12, fontWeight: FontWeight.w500))),
    ])))));
  }
  Widget _buildThumbnail() {
    final logo = widget.channel.logo;
    if (logo != null && logo.isNotEmpty) return CachedNetworkImage(imageUrl: logo, fit: BoxFit.cover, memCacheWidth: 400, placeholder: (_, __) => _shimmer(), errorWidget: (_, __, ___) => _fallback());
    return _fallback();
  }
  Widget _shimmer() => Container(color: _C.bgCard, child: const Center(child: SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _C.border))));
  Widget _fallback() => Container(decoration: const BoxDecoration(gradient: LinearGradient(colors: [Color(0xFF1A0F2E), Color(0xFF2D1B4E)])), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(Icons.live_tv_rounded, color: Color(0x779D4EDD), size: 28), const SizedBox(height: 5), Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text(widget.channel.name, maxLines: 1, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 10)))]));
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(color: _C.accent, strokeWidth: 3)), const SizedBox(height: 20), Text(lang.t('loading_channels'), style: const TextStyle(color: _C.txtSub, fontSize: 15))]));
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(40), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.wifi_off_rounded, size: 64, color: _C.accent), const SizedBox(height: 18), Text(lang.t('no_connection'), style: const TextStyle(color: _C.txt, fontSize: 20, fontWeight: FontWeight.bold)), const SizedBox(height: 10), Text(message, style: const TextStyle(color: _C.txtSub, fontSize: 12), textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis), const SizedBox(height: 28), ElevatedButton.icon(onPressed: onRetry, style: ElevatedButton.styleFrom(backgroundColor: _C.accent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), icon: const Icon(Icons.refresh_rounded), label: Text(lang.t('retry'), style: const TextStyle(fontWeight: FontWeight.bold)))])));
}

class _CategoryCard extends StatelessWidget {
  final String title;
  final int count;
  final bool isFav;
  final VoidCallback onTap;
  const _CategoryCard({required this.title, required this.count, required this.isFav, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final String channelsLabel = lang.locale.value == 'fr' 
      ? "$count chaîne${count > 1 ? 's' : ''}" 
      : "$count channel${count > 1 ? 's' : ''}";
    
    return GestureDetector(onTap: onTap, child: MouseRegion(cursor: SystemMouseCursors.click, child: Container(decoration: BoxDecoration(color: _C.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: isFav ? _C.accent : _C.border, width: isFav ? 1.5 : 1), gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [_C.bgCard, isFav ? _C.accent.withValues(alpha: 0.1) : const Color(0xFF1F1235)])), padding: const EdgeInsets.symmetric(horizontal: 16), child: Row(children: [Container(width: 42, height: 42, decoration: BoxDecoration(color: isFav ? _C.accent : const Color(0xFF2D1B4E), borderRadius: BorderRadius.circular(10)), child: Icon(isFav ? Icons.bookmark_rounded : Icons.live_tv_rounded, color: Colors.white, size: 20)), const SizedBox(width: 14), Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5), maxLines: 1, overflow: TextOverflow.ellipsis), const SizedBox(height: 2), Text(channelsLabel, style: TextStyle(color: isFav ? _C.glow : _C.txtSub, fontSize: 12, fontWeight: FontWeight.w500))])), Icon(Icons.chevron_right_rounded, color: Colors.white.withValues(alpha: 0.3), size: 20)]))));
  }
}

class _LangBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _LangBtn({required this.label, required this.active, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      decoration: BoxDecoration(
        color: active ? _C.accent : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: active ? _C.glow : _C.border),
      ),
      child: Text(label, style: TextStyle(color: active ? Colors.white : _C.txtSub, fontWeight: FontWeight.bold)),
    ),
  );
}
