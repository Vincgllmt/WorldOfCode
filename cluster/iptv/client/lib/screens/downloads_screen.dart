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
          final items = downloadService.items.where((i) => i.status == DownloadStatus.completed).toList();

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

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 16),
            itemCount: items.length,
            itemBuilder: (context, index) {
              final item = items[index];
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: () => Navigator.push(context, MaterialPageRoute(
          builder: (_) => PlayerScreen(
            name: item.title,
            url: item.url,
            type: item.type,
            mediaId: item.id,
            seriesId: item.seriesId,
            cover: item.cover,
          ),
        )),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF1F1235),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0x229D4EDD)),
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
                  ],
                ),
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
