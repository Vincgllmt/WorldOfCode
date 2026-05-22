import 'package:flutter/material.dart';
import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/download_service.dart';
import '../services/language_service.dart';
import '../services/settings_service.dart';
import '../widgets/brand_logo.dart';
import '../utils/text_utils.dart';
import 'player_screen.dart';

class _C {
  static const bg        = Color(0xFF160B25);
  static const accent    = Color(0xFF9D4EDD);
  static const glow      = Color(0xFFBB86FC);
  static const txt       = Color(0xFFFFFFFF);
  static const txtSub    = Color(0xFFB0AEC8);
  static const border    = Color(0x449D4EDD);
}

class DownloadsScreen extends StatefulWidget {
  const DownloadsScreen({super.key});

  @override
  State<DownloadsScreen> createState() => _DownloadsScreenState();
}

class _DownloadsScreenState extends State<DownloadsScreen> {
  bool _searchVisible = false;
  String _query = '';
  final _searchCtrl = TextEditingController();

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearch(String q) {
    setState(() { _query = q; });
  }

  void _openSettings() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0C0714),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) => const _SettingsSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<String>(
      valueListenable: lang.locale,
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: _C.bg,
          extendBodyBehindAppBar: true,
          appBar: _buildAppBar(),
          body: ListenableBuilder(
            listenable: downloadService,
            builder: (context, _) {
              var items = downloadService.items;

              if (_query.isNotEmpty) {
                final lq = normalize(_query);
                items = items.where((i) => normalize(i.title).contains(lq)).toList();
              }

              if (items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.download_for_offline_outlined, size: 64, color: Color(0x33BB86FC)),
                      const SizedBox(height: 16),
                      Text(lang.t('no_downloads'), style: const TextStyle(color: _C.txtSub)),
                    ],
                  ),
                );
              }

              // Group by seriesId if series, or use title if movie
              final grouped = <String, List<DownloadItem>>{};
              for (final item in items) {
                final key = item.type == 'series' ? 'series_${item.seriesId ?? item.id}' : 'movie_${item.id}';
                grouped.putIfAbsent(key, () => []).add(item);
              }

              final groupKeys = grouped.keys.toList();

              return ListView.builder(
                padding: EdgeInsets.only(top: MediaQuery.of(context).padding.top + 90, bottom: 100),
                itemCount: groupKeys.length,
                itemBuilder: (context, index) {
                  final key = groupKeys[index];
                  final groupItems = grouped[key]!;
                  return _DownloadGroup(items: groupItems, isSearching: _query.isNotEmpty);
                },
              );
            },
          ),
        );
      },
    );
  }

  PreferredSizeWidget _buildAppBar() {
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
                if (!(_searchVisible && MediaQuery.of(context).size.width < 600)) ...[
                  const SizedBox(width: 8),
                  const BrandLogo(fontSize: 22, showSubtitle: false),
                ],
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
                        width: MediaQuery.of(context).size.width < 600 ? MediaQuery.of(context).size.width * 0.7 : 200, 
                        height: 40,
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
                ValueListenableBuilder<ViewMode>(
                  valueListenable: settings.viewMode,
                  builder: (context, viewMode, _) => PopupMenuButton<ViewMode>(
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
                ),
                const SizedBox(width: 4),
                _IconBtn(
                  icon: Icons.settings_rounded,
                  onTap: _openSettings,
                ),
                const SizedBox(width: 4),
              ],
            ),
          ),
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
}

class _SettingsSheet extends StatelessWidget {
  const _SettingsSheet();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 40, height: 4,
            decoration: BoxDecoration(color: Colors.white24, borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 24),
          Text(lang.t('settings').toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 1.2)),
          const SizedBox(height: 24),
          ListTile(
            leading: const Icon(Icons.language_rounded, color: Color(0xFFBB86FC)),
            title: Text(lang.t('language'), style: const TextStyle(color: Colors.white)),
            trailing: ValueListenableBuilder<String>(
              valueListenable: lang.locale,
              builder: (context, locale, _) => DropdownButton<String>(
                value: locale,
                dropdownColor: const Color(0xFF1F1235),
                underline: const SizedBox(),
                items: const [
                  DropdownMenuItem(value: 'fr', child: Text('Français', style: TextStyle(color: Colors.white))),
                  DropdownMenuItem(value: 'en', child: Text('English', style: TextStyle(color: Colors.white))),
                ],
                onChanged: (v) { if (v != null) lang.setLanguage(v); },
              ),
            ),
          ),
          const SizedBox(height: 16),
          ListTile(
            leading: const Icon(Icons.logout_rounded, color: Colors.redAccent),
            title: Text(lang.t('logout'), style: const TextStyle(color: Colors.redAccent)),
            onTap: () {
              Navigator.pop(context);
            },
          ),
        ],
      ),
    );
  }
}

class _DownloadGroup extends StatefulWidget {
  final List<DownloadItem> items;
  final bool isSearching;
  const _DownloadGroup({required this.items, this.isSearching = false});

  @override
  State<_DownloadGroup> createState() => _DownloadGroupState();
}

class _DownloadGroupState extends State<_DownloadGroup> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final first = widget.items.first;
    final isSeries = first.type == 'series';
    final title = isSeries ? (first.title.split(' - ').first) : first.title;
    
    final downloading = widget.items.where((i) => i.status == DownloadStatus.downloading || i.status == DownloadStatus.scheduled || i.status == DownloadStatus.pending).length;
    final completed = widget.items.where((i) => i.status == DownloadStatus.completed).length;

    final showItems = _expanded || widget.isSearching;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(10),
            hoverColor: _C.accent.withOpacity(0.2),
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
              child: Row(
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(6),
                    child: SizedBox(
                      width: 40, height: 60,
                      child: first.cover != null
                        ? CachedNetworkImage(imageUrl: first.cover!, fit: BoxFit.cover)
                        : Container(color: const Color(0xFF1F1235), child: const Icon(Icons.movie_rounded, size: 20, color: Color(0x339D4EDD))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                        Text(
                          '${widget.items.length} ${lang.t(widget.items.length > 1 ? 'episodes' : 'episode').toLowerCase()} ($completed fini, $downloading en cours)',
                          style: const TextStyle(color: _C.txtSub, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                  if (downloading > 0)
                    IconButton(
                      icon: const Icon(Icons.cancel_outlined, color: Colors.redAccent, size: 20),
                      onPressed: () {
                        if (isSeries && first.seriesId != null) {
                          downloadService.cancelSeasonDownload(first.seriesId!, first.seasonNum ?? 0);
                        } else {
                          for (final i in widget.items) {
                            if (i.status != DownloadStatus.completed) downloadService.removeDownload(i.id, i.type);
                          }
                        }
                      },
                      tooltip: lang.t('cancel_all'),
                    ),
                  if (completed > 0)
                    IconButton(
                      icon: const Icon(Icons.delete_sweep_rounded, color: Colors.redAccent, size: 20),
                      onPressed: () => _confirmBulkDelete(context),
                      tooltip: lang.t('clear_all'),
                    ),
                  if (!widget.isSearching)
                    Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: _C.txtSub),
                ],
              ),
            ),
          ),
          if (showItems) ...[
            const SizedBox(height: 8),
            ...widget.items.map((item) => _DownloadTile(item: item)),
          ],
        ],
      ),
    );
  }

  void _confirmBulkDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A0F2E),
        title: Text(lang.t('clear_all'), style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: Text(lang.t('delete_all_confirm'), style: const TextStyle(color: _C.txtSub, fontSize: 14)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'), style: const TextStyle(color: _C.txtSub))),
          TextButton(
            onPressed: () {
              for (final item in widget.items) {
                if (item.status == DownloadStatus.completed) {
                  downloadService.removeDownload(item.id, item.type);
                }
              }
              Navigator.pop(ctx);
            },
            child: Text(lang.t('delete'), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _DownloadTile extends StatelessWidget {
  final DownloadItem item;
  const _DownloadTile({required this.item});

  @override
  Widget build(BuildContext context) {
    final bool isCompleted = item.status == DownloadStatus.completed;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: InkWell(
        onTap: isCompleted ? () => Navigator.push(context, MaterialPageRoute(
          builder: (_) => PlayerScreen(
            name: item.title,
            url: item.url,
            type: item.type,
            mediaId: item.id,
            seriesId: item.seriesId,
            cover: item.cover,
          ),
        )) : null,
        borderRadius: BorderRadius.circular(8),
        hoverColor: _C.accent.withOpacity(0.15),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          decoration: BoxDecoration(
            color: const Color(0xFF1F1235).withOpacity(0.5),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: isCompleted ? Colors.transparent : const Color(0x119D4EDD)),
          ),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: TextStyle(color: isCompleted ? Colors.white : _C.txtSub, fontSize: 13, fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    _StatusIndicator(item: item),
                  ],
                ),
              ),
              if (item.status == DownloadStatus.error)
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: Colors.orangeAccent, size: 20),
                  onPressed: () => downloadService.retryDownload(item.id, item.type),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              const SizedBox(width: 8),
              IconButton(
                icon: Icon(isCompleted ? Icons.delete_outline_rounded : Icons.close_rounded, color: isCompleted ? Colors.redAccent : _C.txtSub, size: 20),
                onPressed: () => isCompleted ? _confirmDelete(context) : downloadService.removeDownload(item.id, item.type),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A0F2E),
        title: Text(lang.t('delete_download_title'), style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: Text('${lang.t('delete_download_confirm')} "${item.title}" ?', style: const TextStyle(color: _C.txtSub, fontSize: 14)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'), style: const TextStyle(color: _C.txtSub))),
          TextButton(
            onPressed: () {
              downloadService.removeDownload(item.id, item.type);
              Navigator.pop(ctx);
            },
            child: Text(lang.t('delete'), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _StatusIndicator extends StatelessWidget {
  final DownloadItem item;
  const _StatusIndicator({required this.item});

  @override
  Widget build(BuildContext context) {
    switch (item.status) {
      case DownloadStatus.downloading:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(2),
              child: LinearProgressIndicator(
                value: item.progress,
                minHeight: 4,
                backgroundColor: Colors.white.withValues(alpha: 0.1),
                color: _C.accent,
              ),
            ),
            const SizedBox(height: 4),
            Text('${(item.progress * 100).toInt()}%', style: const TextStyle(color: _C.accent, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        );
      case DownloadStatus.pending:
      case DownloadStatus.scheduled:
        return Row(
          children: [
            const SizedBox(width: 8, height: 8, child: CircularProgressIndicator(strokeWidth: 1.5, color: Color(0xFFBB86FC))),
            const SizedBox(width: 8),
            Text(lang.t('waiting'), style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 11)),
          ],
        );
      case DownloadStatus.error:
        return const Text('Erreur', style: TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.bold));
      case DownloadStatus.completed:
        return Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Color(0xFF4CAF50), size: 14),
            const SizedBox(width: 4),
            const Text('Complet', style: TextStyle(color: Color(0xFF4CAF50), fontSize: 11)),
          ],
        );
      default:
        return const SizedBox.shrink();
    }
  }
}

class _IconBtn extends StatefulWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconBtn({required this.icon, required this.onTap});

  @override
  State<_IconBtn> createState() => _IconBtnState();
}

class _IconBtnState extends State<_IconBtn> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: widget.onTap,
      onFocusChange: (v) => setState(() => _focused = v),
      borderRadius: BorderRadius.circular(8),
      hoverColor: _C.accent.withOpacity(0.2),
      child: MouseRegion(
        cursor: SystemMouseCursors.click,
        child: Container(width: 36, height: 36,
          decoration: BoxDecoration(
            color: _focused ? _C.accent.withOpacity(0.3) : Colors.white.withValues(alpha: 0.07), 
            borderRadius: BorderRadius.circular(8),
            border: _focused ? Border.all(color: Colors.white, width: 1.5) : null,
          ),
          child: Icon(widget.icon, color: Colors.white, size: 20))),
    ),
  );
}

class _SearchField extends StatefulWidget {
  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final String hint;
  const _SearchField({required this.controller, required this.onChanged, required this.hint});

  @override
  State<_SearchField> createState() => _SearchFieldState();
}

class _SearchFieldState extends State<_SearchField> {
  late FocusNode _focusNode;
  bool _readOnly = true;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode();
    _focusNode.addListener(() {
      if (!_focusNode.hasFocus) {
        setState(() => _readOnly = true);
      }
    });
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: widget.controller, 
    focusNode: _focusNode,
    autofocus: true, 
    onChanged: widget.onChanged,
    style: const TextStyle(color: _C.txt, fontSize: 14),
    readOnly: Platform.isAndroid ? _readOnly : false,
    onTap: () {
      if (_readOnly) setState(() => _readOnly = false);
    },
    decoration: InputDecoration(
      hintText: widget.hint, hintStyle: const TextStyle(color: _C.txtSub, fontSize: 13),
      prefixIcon: const Icon(Icons.search_rounded, color: _C.accent, size: 18),
      filled: true, fillColor: const Color(0xFF1A0F2E), contentPadding: EdgeInsets.zero,
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: const BorderSide(color: _C.accent, width: 1.5)),
    ),
  );
}
