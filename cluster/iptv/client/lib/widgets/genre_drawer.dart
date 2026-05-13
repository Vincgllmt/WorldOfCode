import 'package:flutter/material.dart';

class GenreDrawer extends StatefulWidget {
  final String title;
  final List<String> genres;
  final Map<String, int> counts;
  final String? selected;
  final ValueChanged<String?> onSelect;

  const GenreDrawer({
    super.key,
    required this.title,
    required this.genres,
    required this.counts,
    required this.selected,
    required this.onSelect,
  });

  @override
  State<GenreDrawer> createState() => _GenreDrawerState();
}

class _GenreDrawerState extends State<GenreDrawer> {
  String _search = '';
  final _searchCtrl = TextEditingController();

  static const _bg     = Color(0xFF0C0714);
  static const _bgCard = Color(0xFF160B25);
  static const _accent = Color(0xFF9D4EDD);
  static const _glow   = Color(0xFFBB86FC);
  static const _txtSub = Color(0xFFB0AEC8);
  static const _border = Color(0x449D4EDD);

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  List<String> get _filteredGenres {
    if (_search.isEmpty) return widget.genres;
    final lq = _search.toLowerCase();
    return widget.genres.where((g) => g.toLowerCase().contains(lq)).toList();
  }

  int get _total => widget.counts.values.fold(0, (a, b) => a + b);

  @override
  Widget build(BuildContext context) {
    final genres = _filteredGenres;

    return Drawer(
      backgroundColor: _bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 16,
              left: 16, right: 16, bottom: 14,
            ),
            decoration: const BoxDecoration(
              color: _bgCard,
              border: Border(bottom: BorderSide(color: _border)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 3, height: 20,
                      margin: const EdgeInsets.only(right: 10),
                      decoration: BoxDecoration(color: _accent, borderRadius: BorderRadius.circular(2)),
                    ),
                    Text(widget.title, style: const TextStyle(
                      color: _glow, fontSize: 18, fontWeight: FontWeight.w800, letterSpacing: -0.5,
                    )),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pop(context),
                      child: const Icon(Icons.close_rounded, color: _txtSub, size: 20),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                // Search field
                Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.06),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: _border),
                  ),
                  child: TextField(
                    controller: _searchCtrl,
                    onChanged: (v) => setState(() => _search = v),
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'Rechercher un genre...',
                      hintStyle: TextStyle(color: _txtSub.withValues(alpha: 0.7), fontSize: 12),
                      prefixIcon: const Icon(Icons.search_rounded, color: _txtSub, size: 16),
                      suffixIcon: _search.isNotEmpty
                        ? GestureDetector(
                            onTap: () { _searchCtrl.clear(); setState(() => _search = ''); },
                            child: const Icon(Icons.close_rounded, color: _txtSub, size: 14),
                          )
                        : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // "Tous" item
          _GenreItem(
            label: 'Tous les genres',
            count: _total,
            selected: widget.selected == null,
            onTap: () { widget.onSelect(null); Navigator.pop(context); },
          ),

          const Divider(color: _border, height: 1, indent: 16, endIndent: 16),

          // Count label
          if (genres.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 2),
              child: Text(
                '${genres.length} genre${genres.length > 1 ? 's' : ''}',
                style: TextStyle(color: _txtSub.withValues(alpha: 0.5), fontSize: 11),
              ),
            ),

          // Genre list
          Expanded(
            child: genres.isEmpty
              ? Center(
                  child: Text(
                    _search.isEmpty ? 'Chargement...' : 'Aucun genre trouvé',
                    style: const TextStyle(color: _txtSub, fontSize: 13),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.only(top: 4, bottom: 24),
                  itemCount: genres.length,
                  itemBuilder: (_, i) {
                    final g = genres[i];
                    return _GenreItem(
                      label: g,
                      count: widget.counts[g] ?? 0,
                      selected: widget.selected == g,
                      onTap: () { widget.onSelect(g); Navigator.pop(context); },
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }
}

class _GenreItem extends StatefulWidget {
  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  const _GenreItem({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  @override
  State<_GenreItem> createState() => _GenreItemState();
}

class _GenreItemState extends State<_GenreItem> {
  bool _hovered = false;

  static const _accent = Color(0xFF9D4EDD);
  static const _glow   = Color(0xFFBB86FC);
  static const _txt    = Color(0xFFFFFFFF);
  static const _txtSub = Color(0xFFB0AEC8);

  @override
  Widget build(BuildContext context) {
    final active = widget.selected || _hovered;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      onEnter: (_) => setState(() => _hovered = true),
      onExit:  (_) => setState(() => _hovered = false),
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          margin: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 9),
          decoration: BoxDecoration(
            color: widget.selected
              ? const Color(0x229D4EDD)
              : (_hovered ? const Color(0x119D4EDD) : Colors.transparent),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: widget.selected ? _accent : Colors.transparent),
          ),
          child: Row(
            children: [
              if (widget.selected)
                Container(
                  width: 3, height: 14,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(color: _accent, borderRadius: BorderRadius.circular(2)),
                ),
              Expanded(
                child: Text(
                  widget.label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: active ? _txt : _txtSub,
                    fontSize: 13,
                    fontWeight: widget.selected ? FontWeight.w700 : FontWeight.normal,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                '${widget.count}',
                style: TextStyle(
                  color: widget.selected ? _glow : _txtSub.withValues(alpha: 0.5),
                  fontSize: 11,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
