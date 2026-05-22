import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../services/download_service.dart';
import '../services/language_service.dart';
import 'player_screen.dart';

class DownloadsScreen extends StatelessWidget {
  const DownloadsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF160B25),
      appBar: AppBar(
        title: Text(lang.t('downloads'), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
        backgroundColor: const Color(0xF00C0714),
        surfaceTintColor: Colors.transparent,
      ),
      body: ListenableBuilder(
        listenable: downloadService,
        builder: (context, _) {
          final items = downloadService.items;

          if (items.isEmpty) {
            return Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.download_for_offline_outlined, size: 64, color: Color(0x33BB86FC)),
                  const SizedBox(height: 16),
                  Text(lang.t('no_downloads'), style: const TextStyle(color: Color(0xFFB0AEC8))),
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
            padding: const EdgeInsets.symmetric(vertical: 16),
            itemCount: groupKeys.length,
            itemBuilder: (context, index) {
              final key = groupKeys[index];
              final groupItems = grouped[key]!;
              return _DownloadGroup(items: groupItems);
            },
          );
        },
      ),
    );
  }
}

class _DownloadGroup extends StatefulWidget {
  final List<DownloadItem> items;
  const _DownloadGroup({required this.items});

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

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () => setState(() => _expanded = !_expanded),
            borderRadius: BorderRadius.circular(10),
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
                          style: const TextStyle(color: Color(0xFFB0AEC8), fontSize: 12),
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
                  Icon(_expanded ? Icons.expand_less : Icons.expand_more, color: const Color(0xFFB0AEC8)),
                ],
              ),
            ),
          ),
          if (_expanded) ...[
            const SizedBox(height: 8),
            ...widget.items.map((item) => _DownloadTile(item: item)),
          ],
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
                      style: TextStyle(color: isCompleted ? Colors.white : const Color(0xFFB0AEC8), fontSize: 13, fontWeight: isCompleted ? FontWeight.bold : FontWeight.normal),
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
                icon: Icon(isCompleted ? Icons.delete_outline_rounded : Icons.close_rounded, color: isCompleted ? Colors.redAccent : const Color(0xFFB0AEC8), size: 20),
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
    // ... rest of the method unchanged
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A0F2E),
        title: Text(lang.t('delete_download_title'), style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: Text('${lang.t('delete_download_confirm')} "${item.title}" ?', style: const TextStyle(color: Color(0xFFB0AEC8), fontSize: 14)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'))),
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
                color: const Color(0xFF9D4EDD),
              ),
            ),
            const SizedBox(height: 4),
            Text('${(item.progress * 100).toInt()}%', style: const TextStyle(color: Color(0xFF9D4EDD), fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        );
      case DownloadStatus.pending:
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
