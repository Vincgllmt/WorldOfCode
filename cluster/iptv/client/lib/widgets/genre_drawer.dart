import 'package:flutter/material.dart';

class GenreDrawer extends StatelessWidget {
  final String title;
  final List<String> genres;
  final Map<String, int> counts;
  final String? selected;
  final ValueChanged<String?> onSelect;

  static const _bg     = Color(0xFF0C0714);
  static const _bgCard = Color(0xFF160B25);
  static const _accent = Color(0xFF9D4EDD);
  static const _glow   = Color(0xFFBB86FC);
  static const _txtSub = Color(0xFFB0AEC8);
  static const _border = Color(0x449D4EDD);

  const GenreDrawer({
    super.key,
    required this.title,
    required this.genres,
    required this.counts,
    required this.selected,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    final total = counts.values.fold(0, (a, b) => a + b);

    return Drawer(
      backgroundColor: _bg,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: EdgeInsets.only(
              top: MediaQuery.of(context).padding.top + 20,
              left: 20, right: 20, bottom: 20,
            ),
            decoration: const BoxDecoration(
              color: _bgCard,
              border: Border(bottom: BorderSide(color: _border)),
            ),
            child: Row(
              children: [
                Container(
                  width: 3, height: 22,
                  margin: const EdgeInsets.only(right: 10),
                  decoration: BoxDecoration(
                    color: _accent,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Text(title,
                  style: const TextStyle(
                    color: _glow, fontSize: 18,
                    fontWeight: FontWeight.w800, letterSpacing: -0.5,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: () => Navigator.pop(context),
                  child: const Icon(Icons.close_rounded, color: _txtSub, size: 20),
                ),
              ],
            ),
          ),

          // "Tous" item
          _GenreItem(
            label: 'Tous les genres',
            count: total,
            selected: selected == null,
            onTap: () { onSelect(null); Navigator.pop(context); },
          ),

          const Divider(color: _border, height: 1, indent: 20, endIndent: 20),

          // Genre list
          Expanded(
            child: genres.isEmpty
              ? const Center(
                  child: Text('Chargement...', style: TextStyle(color: _txtSub, fontSize: 13)),
                )
              : ListView.builder(
                  padding: const EdgeInsets.only(top: 4, bottom: 24),
                  itemCount: genres.length,
                  itemBuilder: (_, i) {
                    final g = genres[i];
                    return _GenreItem(
                      label: g,
                      count: counts[g] ?? 0,
                      selected: selected == g,
                      onTap: () { onSelect(g); Navigator.pop(context); },
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
          margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: widget.selected
              ? const Color(0x229D4EDD)
              : (_hovered ? const Color(0x119D4EDD) : Colors.transparent),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: widget.selected ? _accent : Colors.transparent,
            ),
          ),
          child: Row(
            children: [
              if (widget.selected)
                Container(
                  width: 3, height: 16,
                  margin: const EdgeInsets.only(right: 8),
                  decoration: BoxDecoration(
                    color: _accent,
                    borderRadius: BorderRadius.circular(2),
                  ),
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
                  color: widget.selected ? _glow : _txtSub.withValues(alpha: 0.6),
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
