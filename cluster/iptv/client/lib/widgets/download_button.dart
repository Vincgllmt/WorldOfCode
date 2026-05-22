import 'package:flutter/material.dart';
import '../services/download_service.dart';
import '../services/language_service.dart';

class DownloadButton extends StatelessWidget {
  final int id;
  final String title;
  final String url;
  final String type;
  final String? cover;
  final int? seriesId;
  final double size;

  const DownloadButton({
    super.key,
    required this.id,
    required this.title,
    required this.url,
    required this.type,
    this.cover,
    this.seriesId,
    this.size = 44,
  });

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: downloadService,
      builder: (context, _) {
        final item = downloadService.getItem(id, type);
        
        if (item == null) {
          return _CircleBtn(
            size: size,
            icon: Icons.download_rounded,
            onTap: () => downloadService.startDownload(DownloadItem(
              id: id,
              title: title,
              url: url,
              type: type,
              cover: cover,
              seriesId: seriesId,
            )),
          );
        }

        switch (item.status) {
          case DownloadStatus.downloading:
            return Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: size, height: size,
                  child: CircularProgressIndicator(
                    value: item.progress,
                    strokeWidth: 3,
                    color: const Color(0xFF9D4EDD),
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                  ),
                ),
                Icon(Icons.close_rounded, size: size * 0.4, color: Colors.white70),
              ],
            );
          case DownloadStatus.pending:
            return Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: size, height: size,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: const Color(0xFFBB86FC).withValues(alpha: 0.5),
                    backgroundColor: Colors.white.withValues(alpha: 0.05),
                  ),
                ),
                Icon(Icons.access_time_rounded, size: size * 0.4, color: const Color(0xFFBB86FC)),
              ],
            );
          case DownloadStatus.completed:
            return _CircleBtn(
              size: size,
              icon: Icons.offline_pin_rounded,
              color: const Color(0xFF4CAF50),
              onTap: () => _confirmDelete(context),
            );
          case DownloadStatus.error:
            return _CircleBtn(
              size: size,
              icon: Icons.error_outline_rounded,
              color: Colors.redAccent,
              onTap: () => downloadService.removeDownload(id, type),
            );
          default:
            return _CircleBtn(size: size, icon: Icons.download_rounded, onTap: () {});
        }
      },
    );
  }

  void _confirmDelete(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1A0F2E),
        title: Text(lang.t('delete_download_title'), style: const TextStyle(color: Colors.white, fontSize: 16)),
        content: Text('${lang.t('delete_download_confirm')} "$title" ?', style: const TextStyle(color: Color(0xFFB0AEC8), fontSize: 14)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(lang.t('cancel'))),
          TextButton(
            onPressed: () {
              downloadService.removeDownload(id, type);
              Navigator.pop(ctx);
            },
            child: Text(lang.t('delete'), style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final Color? color;
  final double size;
  const _CircleBtn({required this.icon, required this.onTap, this.color, required this.size});

  @override
  Widget build(BuildContext context) {
    final themeColor = color ?? const Color(0xFF9D4EDD);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: size, height: size,
        decoration: BoxDecoration(
          color: themeColor.withValues(alpha: 0.15),
          shape: BoxShape.circle,
          border: Border.all(color: themeColor.withValues(alpha: 0.5)),
        ),
        child: Icon(icon, color: color ?? Colors.white, size: size * 0.5),
      ),
    );
  }
}
