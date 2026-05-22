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

          // Sort: Downloading first, then Pending, then Error, then Completed
          final sortedItems = List<DownloadItem>.from(items)..sort((a, b) {
            const order = {
              DownloadStatus.downloading: 0,
              DownloadStatus.pending: 1,
              DownloadStatus.error: 2,
              DownloadStatus.completed: 3,
              DownloadStatus.paused: 4,
            };
            return (order[a.status] ?? 5).compareTo(order[b.status] ?? 5);
          });

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 16),
            itemCount: sortedItems.length,
            itemBuilder: (context, index) {
              final item = sortedItems[index];
              return _DownloadTile(item: item);
            },
          );
        },
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
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
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
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1F1235),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: isCompleted ? const Color(0x229D4EDD) : const Color(0xFF9D4EDD).withValues(alpha: 0.5)),
          ),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 60, height: 90,
                  child: item.cover != null
                    ? CachedNetworkImage(
                        imageUrl: item.cover!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: Colors.black26),
                        errorWidget: (_, __, ___) => const Center(child: Icon(Icons.movie_rounded, size: 30, color: Color(0x339D4EDD))),
                      )
                    : const Center(child: Icon(Icons.movie_rounded, size: 30, color: Color(0x339D4EDD))),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.title,
                      style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                      maxLines: 2, overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.type == 'movie' ? lang.t('movies') : lang.t('series'),
                      style: const TextStyle(color: Color(0xFFB0AEC8), fontSize: 12),
                    ),
                    const SizedBox(height: 8),
                    _StatusIndicator(item: item),
                  ],
                ),
              ),
              if (item.status == DownloadStatus.error)
                IconButton(
                  icon: const Icon(Icons.refresh_rounded, color: Colors.orangeAccent, size: 24),
                  onPressed: () => downloadService.retryDownload(item.id, item.type),
                ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, color: Colors.redAccent, size: 24),
                onPressed: () => _confirmDelete(context),
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
