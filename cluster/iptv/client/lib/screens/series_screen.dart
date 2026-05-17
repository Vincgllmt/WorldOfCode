import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/series_item.dart';
import '../services/api_service.dart';
import '../services/credentials_service.dart';
import '../services/progress_service.dart';
import '../utils/text_utils.dart';
import '../services/genre_favorites_service.dart';
import '../services/language_service.dart';
import '../services/settings_service.dart';
import '../widgets/genre_drawer.dart';
import '../widgets/brand_logo.dart';
import 'series_detail_screen.dart';
import 'setup_screen.dart';

class _C {
  static const bg        = Color(0xFF160B25);
  static const bgCard    = Color(0xFF1F1235);
  static const accent    = Color(0xFF9D4EDD);
  static const glow      = Color(0xFFBB86FC);
  static const txt       = Color(0xFFFFFFFF);
  static const txtSub    = Color(0xFFB0AEC8);
  static const border    = Color(0x449D4EDD);
}

class SeriesScreen extends StatefulWidget {
  const SeriesScreen({super.key});

  @override
  State<SeriesScreen> createState() => _SeriesScreenState();
}

class _SeriesScreenState extends State<SeriesScreen> {
  final ApiService _api = ApiService();
  final _scaffoldKey = GlobalKey<ScaffoldState>();
  late Future<List<SeriesItem>> _future;

  List<SeriesItem> _all = [];
  List<SeriesItem> _filtered = [];
  Set<String> _favGenres    = {};
  String  _query         = '';
  String? _selectedGenre;
  bool    _searchVisible = false;
  final   _searchCtrl    = TextEditingController();

  @override
  void initState() {
    super.initState();
    _future = _load();
    GenreFavoritesService.load('series').then((favs) {
      if (mounted) setState(() => _favGenres = favs);
    });
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<List<SeriesItem>> _load({bool force = false}) async {
    final series = await _api.fetchSeries(forceRefresh: force);
    if (mounted) setState(() { _all = series; _filtered = series; });
    return series;
  }

  Map<String, List<SeriesItem>>? _cachedGroups;
  List<String>? _cachedSortedKeys;

  void _applyFilters() {
    setState(() {
      var result = _all;
      if (_selectedGenre != null) {
        result = result.where((s) => (s.group ?? 'Autres') == _selectedGenre).toList();
      }
      if (_query.isNotEmpty) {
        final lq = normalize(_query);
        result = result.where((s) =>
          normalize(s.name).contains(lq) ||
          normalize(s.group ?? '').contains(lq),
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
    for (final s in _all) { set.add(s.group ?? 'Autres'); }
    return set.toList()..sort();
  }

  Map<String, int> get _genreCounts {
    final map = <String, int>{};
    for (final s in _all) {
      final g = s.group ?? 'Autres';
      map[g] = (map[g] ?? 0) + 1;
    }
    return map;
  }

  Map<String, List<SeriesItem>> _grouped(List<SeriesItem> items) {
    if (_cachedGroups != null) return _cachedGroups!;
    final m = <String, List<SeriesItem>>{};
    for (final s in items) {
      (m[s.group ?? 'Autres'] ??= []).add(s);
    }
    _cachedGroups = m;
    return m;
  }

  void _toggleFavGenre(String genre) {
    setState(() {
      if (_favGenres.contains(genre)) { _favGenres.remove(genre); } else { _favGenres.add(genre); }
      _cachedSortedKeys = null;
    });
    GenreFavoritesService.save('series', _favGenres);
  }

  List<String> _sortedKeys(Map<String, List<SeriesItem>> groups) {
    if (_cachedSortedKeys != null) return _cachedSortedKeys!;
    final fav   = groups.keys.where((k) =>  _favGenres.contains(k)).toList()..sort();
    final other = groups.keys.where((k) => !_favGenres.contains(k)).toList()..sort();
    _cachedSortedKeys = [...fav, ...other];
    return _cachedSortedKeys!;
  }

  Future<void> _open(SeriesItem s) {
    return Navigator.push(context, MaterialPageRoute(
      builder: (_) => SeriesDetailScreen(series: s),
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
    final ok = true;
    if (ok != true || !mounted) return;
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
                title: lang.t('series'),
                genres: _genres,
                counts: _genreCounts,
                selected: _selectedGenre,
                favGenres: _favGenres,
                onSelect: _onGenreSelect,
                onToggleFav: _toggleFavGenre,
              ),
              appBar: _buildAppBar(viewMode),
              body: FutureBuilder<List<SeriesItem>>(
                future: _future,
                builder: (ctx, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return _LoadingView(label: lang.t('loading_series'));
                  }
                  if (snap.hasError) {
                    return _ErrorView(
                      message: snap.error.toString(),
                      onRetry: () => setState(() {
                        _all = []; _filtered = [];
                        _selectedGenre = null;
                        _future = _load();
                      }),
                    );
                  }
                  if (_all.isEmpty) {
                    return const Center(child: Text('Aucune série disponible.', style: TextStyle(color: _C.txtSub)));
                  }

          final groups = _grouped(_filtered);
          final sortedKeys = _sortedKeys(groups);

          return RefreshIndicator(
            onRefresh: () {
              setState(() {});
              return _load(force: true);
            },
            color: _C.accent,
            backgroundColor: _C.bgCard,
            child: CustomScrollView(
              slivers: [
                // Increased spacer at the top to clear the AppBar (70px + status bar)
                SliverToBoxAdapter(child: SizedBox(height: MediaQuery.of(context).padding.top + 90)),

                // Active genre badge / Back button
                if (_selectedGenre != null)
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
                      child: Row(children: [
                        GestureDetector(
                          onTap: () => setState(() => _selectedGenre = null),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: _C.accent.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: _C.accent),
                            ),
                            child: Row(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.arrow_back_rounded, color: Colors.white, size: 18),
                              const SizedBox(width: 8),
                              Text(lang.t('back_to_themes'), style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                            ]),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Text(_selectedGenre!.toUpperCase(), 
                          style: const TextStyle(color: _C.glow, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
                      ]),
                    ),
                  ),

                // Reprendre la lecture
                if (_query.isEmpty && _selectedGenre == null)
                  SliverToBoxAdapter(
                    child: FutureBuilder<List<MediaProgress>>(
                      future: ProgressService.getAll(),
                      builder: (ctx, snap) {
                        final progresses = (snap.data ?? [])
                            .where((p) => p.type == 'series' && !p.isCompleted && p.seriesId != null)
                            .toList();
                        
                        if (progresses.isEmpty) return const SizedBox.shrink();

                        // Match progress with actual series objects (to get full details and allow navigation)
                        // Group by seriesId to only show the series once even if multiple episodes are in progress
                        final Map<int, SeriesItem> seriesMap = { for (final s in _all) s.id: s };
                        final Set<int> addedSeries = {};
                        final List<SeriesItem> recentSeries = [];

                        for (final p in progresses) {
                          if (!addedSeries.contains(p.seriesId)) {
                            final s = seriesMap[p.seriesId];
                            if (s != null) {
                              recentSeries.add(s);
                              addedSeries.add(p.seriesId!);
                            }
                          }
                        }

                        if (recentSeries.isEmpty) return const SizedBox.shrink();

                        return _GenreRow(
                          title: lang.t('continue_watching'),
                          items: recentSeries,
                          isFav: false,
                          onTap: (s) => _open(s).then((_) => setState(() {})),
                          onRemove: (s) async {
                            await ProgressService.removeBySeriesId(s.id);
                            setState(() {});
                          },
                          onFavToggle: () {},
                          onTitleTap: () {},
                          viewMode: viewMode,
                          isAccent: true,
                        );
                      },
                    ),
                  ),

                if (_query.isNotEmpty)
                  ..._buildGridSlivers(_filtered, viewMode, showTitle: true, title: '${lang.t('results_for')} "$_query"')
                else if (viewMode == ViewMode.themes && _selectedGenre == null)
                  // Mode Thèmes uniquement
                  _buildThemesGrid(groups, sortedKeys)
                else if (_selectedGenre != null)
                  // Un seul thème sélectionné
                  ..._buildGridSlivers(groups[_selectedGenre]!, viewMode, showTitle: false)
                else
                  // Mode Images normal : On laisse les thèmes en lignes !
                  for (final key in sortedKeys)
                    SliverToBoxAdapter(
                      child: _GenreRow(
                        title: key,
                        items: groups[key]!,
                        isFav: _favGenres.contains(key),
                        onTap: _open,
                        onFavToggle: () => _toggleFavGenre(key),
                        onTitleTap: () => setState(() => _selectedGenre = key),
                        viewMode: viewMode,
                      ),
                    ),

                const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
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

  List<Widget> _buildGridSlivers(List<SeriesItem> items, ViewMode viewMode, {bool showTitle = false, String? title}) {
    double maxExtent = 150;
    double aspectRatio = 130 / 220;
    
    switch (viewMode) {
      case ViewMode.gridSmall:
        maxExtent = 115;
        break;
      case ViewMode.gridMedium:
        maxExtent = 155;
        break;
      case ViewMode.gridLarge:
        maxExtent = 220;
        break;
      default:
        maxExtent = 155;
    }

    return [
      if (showTitle && title != null)
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 12),
            child: Row(
              children: [
                Container(
                  width: 4, height: 24,
                  decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2)),
                ),
                const SizedBox(width: 12),
                Text(title.toUpperCase(), 
                  style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)),
                const SizedBox(width: 12),
                Text('(${items.length})', style: const TextStyle(color: _C.txtSub, fontSize: 13)),
              ],
            ),
          ),
        ),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
            maxCrossAxisExtent: maxExtent,
            mainAxisSpacing: 24,
            crossAxisSpacing: 12,
            childAspectRatio: aspectRatio,
          ),
          delegate: SliverChildBuilderDelegate(
            (_, i) => _PosterCard(
              name: items[i].name,
              cover: items[i].cover,
              rating: items[i].rating,
              onTap: () => _open(items[i]),
              viewMode: viewMode,
            ),
            childCount: items.length,
          ),
        ),
      ),
    ];
  }

  Widget _buildThemesGrid(Map<String, List<SeriesItem>> groups, List<String> sortedKeys) {
    final width = MediaQuery.of(context).size.width;
    final maxExtent = width < 600 ? width : 350.0;

    return SliverPadding(
      padding: const EdgeInsets.all(16),
      sliver: SliverGrid(
        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
          maxCrossAxisExtent: maxExtent,
          mainAxisSpacing: 12,
          crossAxisSpacing: 16,
          childAspectRatio: width < 600 ? 3.5 / 1 : 2.8 / 1,
        ),
        delegate: SliverChildBuilderDelegate(
          (_, i) {
            final key = sortedKeys[i];
            return _CategoryCard(
              title: key,
              count: groups[key]!.length,
              isFav: _favGenres.contains(key),
              onTap: () => setState(() => _selectedGenre = key),
            );
          },
          childCount: sortedKeys.length,
        ),
      ),
    );
  }

  PopupMenuItem<ViewMode> _buildPopupItem(ViewMode viewMode, ViewMode v, IconData icon, String label) {
    final selected = viewMode == v;
    return PopupMenuItem(
      value: v,
      child: Row(
        children: [
          Icon(icon, size: 18, color: selected ? _C.accent : Colors.white70),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(
            color: selected ? _C.accent : Colors.white,
            fontSize: 14,
            fontWeight: selected ? FontWeight.w700 : FontWeight.normal,
          )),
        ],
      ),
    );
  }

  PreferredSizeWidget _buildAppBar(ViewMode viewMode) {
    return PreferredSize(
      preferredSize: const Size.fromHeight(70),
      child: Container(
        decoration: const BoxDecoration(
          color: Color(0xF00C0714),
          border: Border(bottom: BorderSide(color: _C.border, width: 1)),
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                _IconBtn(
                  icon: Icons.menu_rounded,
                  onTap: () => _scaffoldKey.currentState?.openDrawer(),
                ),
                const SizedBox(width: 8),
                const BrandLogo(fontSize: 22, showSubtitle: false),
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
                        width: 200, height: 40,
                        child: _SearchField(controller: _searchCtrl, onChanged: _onSearch, hint: lang.t('search_hint')),
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
                const SizedBox(width: 4),
                PopupMenuButton<ViewMode>(
                  icon: const Icon(Icons.dashboard_customize_rounded, color: Colors.white, size: 20),
                  tooltip: lang.t('view_mode'),
                  color: const Color(0xFF160B25),
                  offset: const Offset(0, 50),
                  onSelected: (v) => settings.setViewMode(v),
                  itemBuilder: (_) => [
                    _buildPopupItem(viewMode, ViewMode.themes, Icons.list_alt_rounded, lang.t('view_themes')),
                    _buildPopupItem(viewMode, ViewMode.gridSmall, Icons.grid_view_rounded, lang.t('view_grid_small')),
                    _buildPopupItem(viewMode, ViewMode.gridMedium, Icons.grid_view_rounded, lang.t('view_grid_medium')),
                    _buildPopupItem(viewMode, ViewMode.gridLarge, Icons.grid_view_rounded, lang.t('view_grid_large')),
                  ],
                ),
                const SizedBox(width: 4),
                GestureDetector(
                  onTap: _openSettings,
                  child: MouseRegion(
                    cursor: SystemMouseCursors.click,
                    child: const CircleAvatar(
                      radius: 16,
                      backgroundColor: Color(0xFF8A2BE2),
                      child: Icon(Icons.person_rounded, size: 18, color: Colors.white),
                    ),
                  ),
                ),
                const SizedBox(width: 4),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GenreRow extends StatelessWidget {
  final String title;
  final List<SeriesItem> items;
  final bool isFav;
  final void Function(SeriesItem) onTap;
  final void Function(SeriesItem)? onRemove;
  final VoidCallback onFavToggle;
  final VoidCallback onTitleTap;
  final ViewMode viewMode;
  final bool isAccent;

  const _GenreRow({
    required this.title, required this.items, required this.onTap, this.onRemove,
    required this.isFav, required this.onFavToggle, required this.onTitleTap, 
    required this.viewMode, this.isAccent = false,
  });

  @override
  Widget build(BuildContext context) {
    double rowHeight = 247;
    if (viewMode == ViewMode.gridSmall) rowHeight = 195;
    if (viewMode == ViewMode.gridLarge) rowHeight = 350;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 12, 10),
          child: Row(children: [
            if (isAccent) Container(width: 3, height: 18, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2))),
            Expanded(
              child: GestureDetector(
                onTap: onTitleTap,
                child: Row(children: [
                  Flexible(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: isAccent ? _C.glow : _C.txt, fontSize: 16, fontWeight: FontWeight.w700))),
                  const SizedBox(width: 8),
                  Text('(${items.length})', style: const TextStyle(color: _C.txtSub, fontSize: 12)),
                  const SizedBox(width: 4),
                  Icon(Icons.chevron_right_rounded, size: 14, color: _C.txtSub.withValues(alpha: 0.4)),
                ]),
              ),
            ),
            if (!isAccent)
              GestureDetector(
                onTap: onFavToggle,
                child: Padding(
                  padding: const EdgeInsets.all(8),
                  child: Icon(
                    isFav ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
                    size: 18,
                    color: isFav ? _C.accent : _C.txtSub.withValues(alpha: 0.35),
                  ),
                ),
              ),
          ]),
        ),
        SizedBox(
          height: rowHeight,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length,
            itemBuilder: (_, i) => RepaintBoundary(child: _PosterCard(
              name: items[i].name,
              cover: items[i].cover,
              rating: items[i].rating,
              onTap: () => onTap(items[i]),
              onRemove: onRemove != null ? () => onRemove!(items[i]) : null,
              viewMode: viewMode,
            )),
          ),
        ),
      ],
    );
  }
}

class _PosterCard extends StatefulWidget {
  final String name;
  final String? cover;
  final String? rating;
  final VoidCallback onTap;
  final VoidCallback? onRemove;
  final ViewMode viewMode;

  const _PosterCard({required this.name, this.cover, this.rating, required this.onTap, this.onRemove, required this.viewMode});

  @override
  State<_PosterCard> createState() => _PosterCardState();
}

class _PosterCardState extends State<_PosterCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    double w = 130;
    if (widget.viewMode == ViewMode.gridSmall) w = 100;
    if (widget.viewMode == ViewMode.gridLarge) w = 180;

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          width: w,
          margin: const EdgeInsets.symmetric(horizontal: 6),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 200),
            curve: Curves.easeOut,
            transform: _hovered ? (Matrix4.identity()..scale(1.05, 1.05, 1.0)) : Matrix4.identity(),
            transformAlignment: Alignment.center,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    width: w,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: _hovered ? _C.accent : Colors.transparent, width: 2),
                      boxShadow: _hovered
                        ? [BoxShadow(color: _C.accent.withValues(alpha: 0.45), blurRadius: 16, spreadRadius: 1)]
                        : [],
                    ),
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: _buildCover(),
                        ),
                        if (widget.onRemove != null)
                          Positioned(
                            top: 4, right: 4,
                            child: Material(
                              color: Colors.transparent,
                              child: IconButton(
                                icon: const Icon(Icons.close_rounded, size: 16),
                                color: Colors.white,
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.redAccent.withValues(alpha: 0.8),
                                  padding: const EdgeInsets.all(4),
                                  minimumSize: const Size(24, 24),
                                ),
                                onPressed: widget.onRemove,
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 6),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 2),
                  child: Text(widget.name, maxLines: 1, overflow: TextOverflow.ellipsis,
                    style: TextStyle(color: _hovered ? _C.glow : _C.txtSub, fontSize: 11, fontWeight: FontWeight.w500)),
                ),
                if (widget.rating != null && widget.rating!.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Text('★ ${widget.rating}', style: const TextStyle(color: Color(0xFFFFD700), fontSize: 10)),
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
        memCacheWidth: 250, // Optimize memory for vertical posters
        placeholder: (_, __) => _shimmer(),
        errorWidget: (_, __, ___) => _fallback(),
      );
    }
    return _fallback();
  }

  Widget _shimmer() => Container(
    color: _C.bgCard,
    child: const Center(child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: _C.border))),
  );

  Widget _fallback() => Container(
    decoration: const BoxDecoration(
      gradient: LinearGradient(
        begin: Alignment.topLeft, end: Alignment.bottomRight,
        colors: [Color(0xFF1A0F2E), Color(0xFF2D1B4E)],
      ),
    ),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.tv_rounded, color: Color(0x779D4EDD), size: 32),
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

// ─── Shared ───────────────────────────────────────────────────────────────────
class _IconBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => MouseRegion(
    cursor: SystemMouseCursors.click,
    child: GestureDetector(onTap: onTap,
      child: Container(width: 36, height: 36,
        decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, color: Colors.white, size: 20))),
  );
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hint;
  const _SearchField({required this.controller, required this.onChanged, required this.hint});
  @override
  Widget build(BuildContext context) => TextField(
    controller: controller, autofocus: true, onChanged: onChanged,
    style: const TextStyle(color: _C.txt, fontSize: 14),
    decoration: InputDecoration(
      hintText: hint, hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13),
      prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
      filled: true, fillColor: const Color(0xFF1A0F2E), contentPadding: EdgeInsets.zero,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.accent, width: 1.5)),
    ),
  );
}

class _LoadingView extends StatelessWidget {
  final String label;
  const _LoadingView({required this.label});
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
    const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(color: _C.accent, strokeWidth: 3)),
    const SizedBox(height: 20),
    Text(label, style: const TextStyle(color: _C.txtSub, fontSize: 15)),
  ]));
}

class _ErrorView extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(40), child: Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      const Icon(Icons.wifi_off_rounded, size: 64, color: _C.accent),
      const SizedBox(height: 18),
      Text(lang.t('no_connection'), style: const TextStyle(color: _C.txt, fontSize: 20, fontWeight: FontWeight.bold)),
      const SizedBox(height: 10),
      Text(message, style: const TextStyle(color: _C.txtSub, fontSize: 12), textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis),
      const SizedBox(height: 28),
      ElevatedButton.icon(onPressed: onRetry,
        style: ElevatedButton.styleFrom(backgroundColor: _C.accent, foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
        icon: const Icon(Icons.refresh_rounded),
        label: Text(lang.t('retry'), style: const TextStyle(fontWeight: FontWeight.bold))),
    ],
  )));
}

class _CategoryCard extends StatelessWidget {
  final String title;
  final int count;
  final bool isFav;
  final VoidCallback onTap;

  const _CategoryCard({
    required this.title,
    required this.count,
    required this.isFav,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final String seriesLabel = lang.locale.value == 'fr' 
      ? "$count série${count > 1 ? 's' : ''}" 
      : "$count series";

    return GestureDetector(
      onTap: onTap,
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Container(
          decoration: BoxDecoration(
            color: _C.bgCard,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isFav ? _C.accent : _C.border, width: isFav ? 1.5 : 1),
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                _C.bgCard,
                isFav ? _C.accent.withValues(alpha: 0.1) : const Color(0xFF1F1235),
              ],
            ),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: isFav ? _C.accent : const Color(0xFF2D1B4E),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(
                  isFav ? Icons.bookmark_rounded : Icons.folder_open_rounded,
                  color: Colors.white,
                  size: 20,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      seriesLabel,
                      style: TextStyle(
                        color: isFav ? _C.glow : _C.txtSub,
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: Colors.white.withValues(alpha: 0.3), size: 20),
            ],
          ),
        ),
      ),
    );
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
