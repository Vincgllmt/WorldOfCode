import 'package:flutter/material.dart';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/series_item.dart';
import '../services/api_service.dart';
import '../services/credentials_service.dart';
import '../services/progress_service.dart';
import '../utils/text_utils.dart';
import '../services/genre_favorites_service.dart';
import '../services/language_service.dart';
import '../services/settings_service.dart';
import '../services/progress_service.dart';
import '../widgets/genre_drawer.dart';
import '../widgets/brand_logo.dart';
import 'series_detail_screen.dart';
import 'player_screen.dart';
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

  void _applyFilters() {
    setState(() {
      var result = _all;
      if (_selectedGenre != null) {
        result = result.where((s) => (s.group ?? lang.t('other')) == _selectedGenre).toList();
      }
      if (_query.isNotEmpty) {
        final lq = normalize(_query);
        result = result.where((s) => normalize(s.name).contains(lq) || normalize(s.group ?? '').contains(lq)).toList();
      }
      _filtered = result;
    });
  }

  void _onSearch(String q) { _query = q; _applyFilters(); }
  void _onGenreSelect(String? genre) { _selectedGenre = genre; _applyFilters(); }

  List<String> get _genres {
    final set = <String>{};
    for (final s in _all) { set.add(s.group ?? lang.t('other')); }
    return set.toList()..sort();
  }

  Map<String, int> get _genreCounts {
    final map = <String, int>{};
    for (final s in _all) {
      final g = s.group ?? lang.t('other');
      map[g] = (map[g] ?? 0) + 1;
    }
    return map;
  }

  void _toggleFavGenre(String genre) {
    setState(() {
      if (_favGenres.contains(genre)) { _favGenres.remove(genre); } else { _favGenres.add(genre); }
    });
    GenreFavoritesService.save('series', _favGenres);
  }

  void _open(SeriesItem s) {
    Navigator.push(context, MaterialPageRoute(builder: (_) => SeriesDetailScreen(series: s)));
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
            onPressed: () async {
              Navigator.pop(ctx);
              await CredentialsService.clear();
              ApiService.invalidateCache();
              if (mounted) {
                Navigator.of(context).pushAndRemoveUntil(MaterialPageRoute(builder: (_) => const SetupScreen()), (route) => false);
              }
            },
            child: Text(lang.t('logout'), style: const TextStyle(color: Color(0xFFCF6679), fontWeight: FontWeight.w700)),
          ),
        ],
      ),
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
                title: lang.t('series'), genres: _genres, counts: _genreCounts, selected: _selectedGenre,
                favGenres: _favGenres, onSelect: _onGenreSelect, onToggleFav: _toggleFavGenre,
              ),
              appBar: _buildAppBar(viewMode),
              body: FutureBuilder<List<SeriesItem>>(
                future: _future,
                builder: (ctx, snap) {
                  if (snap.connectionState == ConnectionState.waiting && _all.isEmpty) return const _LoadingView();
                  if (snap.hasError && _all.isEmpty) return _ErrorView(message: snap.error.toString(), onRetry: () => setState(() { _all = []; _filtered = []; _future = _load(); }));

                  final Map<String, List<SeriesItem>> groups = {};
                  for (final s in _filtered) { (groups[s.group ?? lang.t('other')] ??= []).add(s); }
                  final keys = groups.keys.toList();
                  final fav = keys.where((k) => _favGenres.contains(k)).toList()..sort();
                  final other = keys.where((k) => !_favGenres.contains(k)).toList()..sort();
                  final sortedKeys = [...fav, ...other];

                  return RefreshIndicator(
                    onRefresh: () => _load(force: true),
                    color: _C.accent, backgroundColor: _C.bgCard,
                    child: CustomScrollView(
                      slivers: [
                        SliverToBoxAdapter(child: SizedBox(height: MediaQuery.of(context).padding.top + 90)),

                        // Continue Watching Section
                        SliverToBoxAdapter(
                          child: FutureBuilder<List<MediaProgress>>(
                            future: ProgressService.getAll(),
                            builder: (context, pSnap) {
                              final recent = (pSnap.data ?? []).where((p) => !p.isCompleted && p.type == 'series').toList();
                              if (recent.isEmpty) return const SizedBox.shrink();
                              return _ContinueWatchingRow(items: recent);
                            },
                          ),
                        ),

                        if (_query.isNotEmpty) ..._buildGridSlivers(_filtered, viewMode, showTitle: true, title: '${lang.t('results_for')} "$_query"')
                        else if (viewMode == ViewMode.themes && _selectedGenre == null) _buildThemesGrid(groups, sortedKeys)
                        else if (_selectedGenre != null) ..._buildGridSlivers(groups[_selectedGenre]!, viewMode, showTitle: false)
                        else
                          for (final key in sortedKeys)
                            SliverToBoxAdapter(child: _GenreRow(
                              title: key, items: groups[key]!, isFav: _favGenres.contains(key),
                              onTap: _open, onFavToggle: () => _toggleFavGenre(key),
                              onTitleTap: () => setState(() => _selectedGenre = key),
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

  PreferredSizeWidget _buildAppBar(ViewMode viewMode) {
    return PreferredSize(
      preferredSize: const Size.fromHeight(70),
      child: Container(
        decoration: const BoxDecoration(color: Color(0xF00C0714), border: Border(bottom: BorderSide(color: _C.border, width: 1))),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(children: [
              if (!(_searchVisible && MediaQuery.of(context).size.width < 600)) ...[
                _IconBtn(icon: Icons.menu_rounded, onTap: () => _scaffoldKey.currentState?.openDrawer()),
                const SizedBox(width: 8),
                const BrandLogo(fontSize: 22, showSubtitle: false),
              ],
              const Spacer(),
              AnimatedSwitcher(
                duration: const Duration(milliseconds: 280),
                transitionBuilder: (child, anim) => FadeTransition(opacity: anim, child: SizeTransition(sizeFactor: anim, axis: Axis.horizontal, child: child)),
                child: _searchVisible 
                  ? SizedBox(key: const ValueKey('f'), width: MediaQuery.of(context).size.width < 600 ? MediaQuery.of(context).size.width * 0.7 : 200, height: 40, child: _SearchField(controller: _searchCtrl, onChanged: _onSearch)) 
                  : const SizedBox(key: ValueKey('e')),
              ),
              const SizedBox(width: 6),
              _IconBtn(icon: _searchVisible ? Icons.close_rounded : Icons.search_rounded, onTap: () => setState(() { _searchVisible = !_searchVisible; if (!_searchVisible) { _searchCtrl.clear(); _onSearch(''); } })),
              const SizedBox(width: 4),
              PopupMenuButton<ViewMode>(
                icon: const Icon(Icons.dashboard_customize_rounded, color: Colors.white, size: 20),
                tooltip: lang.t('view_mode'), color: const Color(0xFF160B25), offset: const Offset(0, 50),
                onSelected: (v) => settings.setViewMode(v),
                itemBuilder: (_) => [
                  _buildPopupItem(viewMode, ViewMode.themes, Icons.list_alt_rounded, lang.t('view_themes')),
                  _buildPopupItem(viewMode, ViewMode.gridSmall, Icons.grid_view_rounded, lang.t('view_grid_small')),
                  _buildPopupItem(viewMode, ViewMode.gridMedium, Icons.grid_view_rounded, lang.t('view_grid_medium')),
                  _buildPopupItem(viewMode, ViewMode.gridLarge, Icons.grid_view_rounded, lang.t('view_grid_large')),
                ],
              ),
              const SizedBox(width: 4),
              _IconBtn(icon: Icons.settings_rounded, onTap: _openSettings),
              const SizedBox(width: 4),
            ]),
          ),
        ),
      ),
    );
  }

  PopupMenuItem<ViewMode> _buildPopupItem(ViewMode viewMode, ViewMode v, IconData icon, String label) {
    final selected = viewMode == v;
    return PopupMenuItem(value: v, child: Row(children: [Icon(icon, size: 18, color: selected ? _C.accent : Colors.white70), const SizedBox(width: 12), Text(label, style: TextStyle(color: selected ? _C.accent : Colors.white, fontSize: 14, fontWeight: selected ? FontWeight.w700 : FontWeight.normal))]));
  }

  List<Widget> _buildGridSlivers(List<SeriesItem> items, ViewMode viewMode, {bool showTitle = false, String? title}) {
    double maxExtent = 155;
    double aspectRatio = 130 / 220;
    switch (viewMode) {
      case ViewMode.gridSmall: maxExtent = 115; break;
      case ViewMode.gridMedium: maxExtent = 155; break;
      case ViewMode.gridLarge: maxExtent = 220; break;
      default: maxExtent = 155;
    }
    return [
      if (showTitle && title != null)
        SliverToBoxAdapter(child: Padding(padding: const EdgeInsets.fromLTRB(24, 32, 24, 12), child: Row(children: [Container(width: 4, height: 24, decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2))), const SizedBox(width: 12), Text(title.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 1)), const SizedBox(width: 12), Text('(${items.length})', style: const TextStyle(color: _C.txtSub, fontSize: 13))]))),
      SliverPadding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        sliver: SliverGrid(
          gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: maxExtent, mainAxisSpacing: 24, crossAxisSpacing: 12, childAspectRatio: aspectRatio),
          delegate: SliverChildBuilderDelegate((_, i) => _PosterCard(name: items[i].name, cover: items[i].cover, rating: items[i].rating, onTap: () => _open(items[i]), viewMode: viewMode), childCount: items.length),
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
        gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: maxExtent, mainAxisSpacing: 12, crossAxisSpacing: 16, childAspectRatio: width < 600 ? 3.5 / 1 : 2.8 / 1),
        delegate: SliverChildBuilderDelegate((_, i) {
          final key = sortedKeys[i];
          return _CategoryCard(title: key, count: groups[key]!.length, isFav: _favGenres.contains(key), onTap: () => setState(() => _selectedGenre = key));
        }, childCount: sortedKeys.length),
      ),
    );
  }
}

class _LangBtn extends StatefulWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _LangBtn({required this.label, required this.active, required this.onTap});
  @override
  State<_LangBtn> createState() => _LangBtnState();
}

class _LangBtnState extends State<_LangBtn> {
  bool _focused = false;
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: widget.onTap,
      onFocusChange: (v) => setState(() => _focused = v),
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: widget.active ? _C.accent : (_focused ? Colors.white.withOpacity(0.15) : Colors.white.withValues(alpha: 0.05)),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: widget.active ? _C.glow : (_focused ? Colors.white : _C.border), width: _focused ? 2.0 : 1.0),
        ),
        child: Text(widget.label, style: TextStyle(color: widget.active ? Colors.white : (_focused ? Colors.white : _C.txtSub), fontWeight: FontWeight.bold)),
      ),
    ),
  );
}

class _GenreRow extends StatelessWidget {
  final String title; final List<SeriesItem> items; final bool isFav; final void Function(SeriesItem) onTap; final VoidCallback onFavToggle; final VoidCallback onTitleTap; final ViewMode viewMode;
  const _GenreRow({required this.title, required this.items, required this.onTap, required this.isFav, required this.onFavToggle, required this.onTitleTap, required this.viewMode});
  @override
  Widget build(BuildContext context) {
    double rowHeight = 247;
    if (viewMode == ViewMode.gridSmall) rowHeight = 195;
    if (viewMode == ViewMode.gridLarge) rowHeight = 350;
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Padding(padding: const EdgeInsets.fromLTRB(24, 24, 12, 10), child: Row(children: [
        Expanded(child: GestureDetector(onTap: onTitleTap, child: Row(children: [Flexible(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: _C.txt, fontSize: 16, fontWeight: FontWeight.w700))), const SizedBox(width: 8), Text('(${items.length})', style: const TextStyle(color: _C.txtSub, fontSize: 12)), const SizedBox(width: 4), Icon(Icons.chevron_right_rounded, size: 14, color: _C.txtSub.withValues(alpha: 0.4))]))),
        GestureDetector(onTap: onFavToggle, child: Padding(padding: const EdgeInsets.all(8), child: Icon(isFav ? Icons.bookmark_rounded : Icons.bookmark_border_rounded, size: 18, color: isFav ? _C.accent : _C.txtSub.withValues(alpha: 0.35)))),
      ])),
      SizedBox(height: rowHeight, child: ListView.builder(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), itemCount: items.length, itemBuilder: (_, i) => RepaintBoundary(child: _PosterCard(name: items[i].name, cover: items[i].cover, rating: items[i].rating, onTap: () => onTap(items[i]), viewMode: viewMode)))),
    ]);
  }
}

class _PosterCard extends StatefulWidget {
  final String name; final String? cover; final String? rating; final VoidCallback onTap; final ViewMode viewMode;
  const _PosterCard({required this.name, this.cover, this.rating, required this.onTap, required this.viewMode});
  @override
  State<_PosterCard> createState() => _PosterCardState();
}

class _PosterCardState extends State<_PosterCard> {
  bool _hovered = false; bool _focused = false; bool get _active => _hovered || _focused;
  @override
  Widget build(BuildContext context) {
    double w = 130;
    if (widget.viewMode == ViewMode.gridSmall) w = 100;
    if (widget.viewMode == ViewMode.gridLarge) w = 180;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: widget.onTap, onFocusChange: (v) => setState(() => _focused = v), borderRadius: BorderRadius.circular(8),
        child: MouseRegion(cursor: SystemMouseCursors.click, onEnter: (_) => setState(() => _hovered = true), onExit: (_) => setState(() => _hovered = false), child: Container(width: w, margin: const EdgeInsets.symmetric(horizontal: 6), child: AnimatedContainer(duration: const Duration(milliseconds: 200), curve: Curves.easeOut, transform: _active ? (Matrix4.identity()..scale(1.05, 1.05, 1.0)) : Matrix4.identity(), transformAlignment: Alignment.center, child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: AnimatedContainer(duration: const Duration(milliseconds: 200), decoration: BoxDecoration(borderRadius: BorderRadius.circular(8), border: Border.all(color: _active ? _C.accent : Colors.transparent, width: 2), boxShadow: _active ? [BoxShadow(color: _C.accent.withValues(alpha: 0.45), blurRadius: 16, spreadRadius: 1)] : []), child: ClipRRect(borderRadius: BorderRadius.circular(8), child: _buildCover()))), const SizedBox(height: 6), Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: Text(widget.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: _active ? _C.glow : _C.txtSub, fontSize: 11, fontWeight: FontWeight.w500))), if (widget.rating != null && widget.rating!.isNotEmpty) Padding(padding: const EdgeInsets.symmetric(horizontal: 2), child: Text('★ ${widget.rating}', style: const TextStyle(color: Color(0xFFFFD700), fontSize: 10)))]))))
      ),
    );
  }
  Widget _buildCover() {
    if (widget.cover != null && widget.cover!.isNotEmpty) return CachedNetworkImage(imageUrl: widget.cover!, fit: BoxFit.cover, fadeInDuration: const Duration(milliseconds: 150), placeholder: (_, __) => Container(color: _C.bgCard), errorWidget: (_, __, ___) => _fallback());
    return _fallback();
  }
  Widget _fallback() => Container(decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF1A0F2E), Color(0xFF2D1B4E)])), child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [const Icon(Icons.tv_rounded, color: Color(0x779D4EDD), size: 32), const SizedBox(height: 6), Padding(padding: const EdgeInsets.symmetric(horizontal: 8), child: Text(widget.name, maxLines: 2, overflow: TextOverflow.ellipsis, textAlign: TextAlign.center, style: const TextStyle(color: Color(0x99FFFFFF), fontSize: 9)))]));
}

class _IconBtn extends StatefulWidget {
  final IconData icon; final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});
  @override
  State<_IconBtn> createState() => _IconBtnState();
}

class _IconBtnState extends State<_IconBtn> {
  bool _focused = false;
  @override
  Widget build(BuildContext context) => Material(color: Colors.transparent, child: InkWell(onTap: widget.onTap, onFocusChange: (v) => setState(() => _focused = v), borderRadius: BorderRadius.circular(8), hoverColor: _C.accent.withOpacity(0.2), child: MouseRegion(cursor: SystemMouseCursors.click, child: Container(width: 36, height: 36, decoration: BoxDecoration(color: _focused ? _C.accent.withOpacity(0.3) : Colors.white.withValues(alpha: 0.07), borderRadius: BorderRadius.circular(8), border: _focused ? Border.all(color: Colors.white, width: 1.5) : null), child: Icon(widget.icon, color: Colors.white, size: 20)))));
}

class _SearchField extends StatelessWidget {
  final TextEditingController controller; final ValueChanged<String> onChanged;
  const _SearchField({required this.controller, required this.onChanged});
  @override
  Widget build(BuildContext context) => TextField(
    controller: controller, autofocus: true, onChanged: onChanged, style: const TextStyle(color: _C.txt, fontSize: 14),
    decoration: InputDecoration(
      hintText: lang.t('search_hint'), hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13), prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
      filled: true, fillColor: const Color(0xFF1A0F2E), contentPadding: EdgeInsets.zero,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.accent, width: 1.5)),
    ),
  );
}

class _LoadingView extends StatelessWidget {
  const _LoadingView();
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisSize: MainAxisSize.min, children: [const SizedBox(width: 48, height: 48, child: CircularProgressIndicator(color: _C.accent, strokeWidth: 3)), const SizedBox(height: 20), Text(lang.t('loading_series'), style: const TextStyle(color: _C.txtSub, fontSize: 15))]));
}

class _ErrorView extends StatelessWidget {
  final String message; final VoidCallback onRetry;
  const _ErrorView({required this.message, required this.onRetry});
  @override
  Widget build(BuildContext context) => Center(child: Padding(padding: const EdgeInsets.all(40), child: Column(mainAxisSize: MainAxisSize.min, children: [const Icon(Icons.wifi_off_rounded, size: 64, color: _C.accent), const SizedBox(height: 18), Text(lang.t('no_connection'), style: const TextStyle(color: _C.txt, fontSize: 20, fontWeight: FontWeight.bold)), const SizedBox(height: 10), Text(message, style: const TextStyle(color: _C.txtSub, fontSize: 12), textAlign: TextAlign.center, maxLines: 3, overflow: TextOverflow.ellipsis), const SizedBox(height: 28), ElevatedButton.icon(onPressed: onRetry, style: ElevatedButton.styleFrom(backgroundColor: _C.accent, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))), icon: const Icon(Icons.refresh_rounded), label: Text(lang.t('retry'), style: const TextStyle(fontWeight: FontWeight.bold)))])));
}

class _CategoryCard extends StatefulWidget {
  final String title; final int count; final bool isFav; final VoidCallback onTap;
  const _CategoryCard({required this.title, required this.count, required this.isFav, required this.onTap});
  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> {
  bool _focused = false;
  @override
  Widget build(BuildContext context) {
    final String seriesLabel = lang.locale.value == 'fr' ? "${widget.count} série${widget.count > 1 ? 's' : ''}" : "${widget.count} series";
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: widget.onTap, onFocusChange: (v) => setState(() => _focused = v), borderRadius: BorderRadius.circular(12),
        child: MouseRegion(cursor: SystemMouseCursors.click, child: Container(decoration: BoxDecoration(color: _C.bgCard, borderRadius: BorderRadius.circular(12), border: Border.all(color: widget.isFav ? _C.accent : (_focused ? Colors.white : _C.border), width: (widget.isFav || _focused) ? 1.5 : 1), gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [_C.bgCard, (widget.isFav || _focused) ? _C.accent.withValues(alpha: 0.1) : const Color(0xFF1F1235)])), padding: const EdgeInsets.symmetric(horizontal: 16), child: Row(children: [Container(width: 42, height: 42, decoration: BoxDecoration(color: widget.isFav ? _C.accent : const Color(0xFF2D1B4E), borderRadius: BorderRadius.circular(10)), child: Icon(widget.isFav ? Icons.bookmark_rounded : Icons.tv_rounded, color: Colors.white, size: 20)), const SizedBox(width: 14), Expanded(child: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.start, children: [Text(widget.title.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w800, letterSpacing: 0.5), maxLines: 1, overflow: TextOverflow.ellipsis), const SizedBox(height: 2), Text(seriesLabel, style: TextStyle(color: widget.isFav ? _C.glow : _C.txtSub, fontSize: 12, fontWeight: FontWeight.w500))])), Icon(Icons.chevron_right_rounded, color: Colors.white.withValues(alpha: 0.3), size: 20)])))
      ),
    );
  }
}

class _ContinueWatchingRow extends StatelessWidget {
  final List<MediaProgress> items;
  const _ContinueWatchingRow({required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 16),
          child: Row(
            children: [
              Container(width: 4, height: 18, decoration: BoxDecoration(color: _C.accent, borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 12),
              Text(lang.t('continue_watching').toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 1)),
            ],
          ),
        ),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            itemCount: items.length,
            itemBuilder: (_, i) => _ContinueCard(progress: items[i]),
          ),
        ),
        const SizedBox(height: 10),
      ],
    );
  }
}

class _ContinueCard extends StatefulWidget {
  final MediaProgress progress;
  const _ContinueCard({required this.progress});
  @override
  State<_ContinueCard> createState() => _ContinueCardState();
}

class _ContinueCardState extends State<_ContinueCard> {
  bool _hovered = false;

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    final percent = (p.positionSeconds / p.durationSeconds).clamp(0.0, 1.0);

    return InkWell(
      onTap: () {
        Navigator.push(context, MaterialPageRoute(
          builder: (_) => PlayerScreen(
            name: p.title, url: p.url, type: p.type, 
            mediaId: p.mediaId, seriesId: p.seriesId, cover: p.cover,
          ),
        ));
      },
      onHover: (v) => setState(() => _hovered = v),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        width: 220,
        margin: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: const Color(0xFF1F1235),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _hovered ? const Color(0xFF9D4EDD) : Colors.white10),
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            children: [
              if (p.cover != null)
                Positioned.fill(
                  child: Opacity(
                    opacity: 0.3,
                    child: CachedNetworkImage(imageUrl: p.cover!, fit: BoxFit.cover),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(p.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                    const Spacer(),
                    Row(
                      children: [
                        Icon(p.type == 'movie' ? Icons.movie_rounded : Icons.tv_rounded, size: 12, color: const Color(0xFFB0AEC8)),
                        const SizedBox(width: 6),
                        Text(lang.t(p.type == 'movie' ? 'movies' : 'series'), style: const TextStyle(color: const Color(0xFFB0AEC8), fontSize: 10)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(2),
                      child: LinearProgressIndicator(
                        value: percent,
                        minHeight: 3,
                        backgroundColor: Colors.white.withOpacity(0.1),
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF9D4EDD)),
                      ),
                    ),
                  ],
                ),
              ),
              if (_hovered)
                const Center(child: Icon(Icons.play_arrow_rounded, color: Colors.white, size: 40)),
            ],
          ),
        ),
      ),
    );
  }
}
