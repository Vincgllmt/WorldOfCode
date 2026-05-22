import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:path_provider/path_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum DownloadStatus { pending, downloading, completed, error, paused, scheduled }

class DownloadItem {
  final int id;
  final String title;
  final String url;
  final String type; // 'movie' or 'series'
  final String? cover;
  String? filePath;
  double progress;
  DownloadStatus status;
  int? seriesId;

  DownloadItem({
    required this.id,
    required this.title,
    required this.url,
    required this.type,
    this.cover,
    this.filePath,
    this.progress = 0.0,
    this.status = DownloadStatus.pending,
    this.seriesId,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'url': url,
    'type': type,
    'cover': cover,
    'filePath': filePath,
    'progress': progress,
    'status': status.index,
    'seriesId': seriesId,
  };

  factory DownloadItem.fromJson(Map<String, dynamic> j) => DownloadItem(
    id: j['id'] as int,
    title: j['title'] as String,
    url: j['url'] as String,
    type: j['type'] as String,
    cover: j['cover'] as String?,
    filePath: j['filePath'] as String?,
    progress: (j['progress'] as num).toDouble(),
    status: DownloadStatus.values[j['status'] as int >= DownloadStatus.values.length ? 0 : j['status'] as int],
    seriesId: j['seriesId'] as int?,
  );
}

class DownloadService extends ChangeNotifier {
  static final DownloadService _instance = DownloadService._internal();
  factory DownloadService() => _instance;
  DownloadService._internal();

  final Dio _dio = Dio();
  final List<DownloadItem> _items = [];
  final Map<int, CancelToken> _cancelTokens = {};
  final int _maxConcurrent = 1;

  List<DownloadItem> get items => List.unmodifiable(_items);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final data = prefs.getStringList('downloads_metadata') ?? [];
    _items.clear();
    _items.addAll(data.map((e) => DownloadItem.fromJson(json.decode(e))));
    
    // Resume pending or interrupted downloads
    for (var item in _items) {
      if (item.status == DownloadStatus.downloading) {
        item.status = DownloadStatus.pending;
      }
    }
    _checkQueue();
    notifyListeners();
  }

  Future<void> _saveMetadata() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('downloads_metadata', _items.map((e) => json.encode(e.toJson())).toList());
  }

  Future<void> startDownload(DownloadItem item) async {
    final existingIndex = _items.indexWhere((i) => i.id == item.id && i.type == item.type);
    if (existingIndex != -1) {
      // If it failed or was pending, allow restarting/queuing
      if (_items[existingIndex].status == DownloadStatus.error) {
        _items[existingIndex].status = DownloadStatus.pending;
        _checkQueue();
      }
      return;
    }

    _items.add(item);
    item.status = DownloadStatus.pending;
    _saveMetadata();
    _checkQueue();
    notifyListeners();
  }

  void _checkQueue() {
    final activeCount = _items.where((i) => i.status == DownloadStatus.downloading || i.status == DownloadStatus.scheduled).length;
    if (activeCount >= _maxConcurrent) return;

    try {
      final nextItem = _items.firstWhere((i) => i.status == DownloadStatus.pending);
      
      // Mark as scheduled immediately to avoid server-side concurrent connection issues
      nextItem.status = DownloadStatus.scheduled;
      notifyListeners();

      // Wait 2 seconds before starting to avoid server-side concurrent connection issues
      Timer(const Duration(seconds: 2), () => _executeDownload(nextItem));
    } catch (_) {
      // No pending items
    }
  }

  Future<void> cancelSeasonDownload(int seriesId) async {
    final toRemove = _items.where((i) => i.seriesId == seriesId && (i.status == DownloadStatus.pending || i.status == DownloadStatus.scheduled || i.status == DownloadStatus.downloading || i.status == DownloadStatus.error)).toList();
    for (final item in toRemove) {
      await removeDownload(item.id, item.type);
    }
  }

  Future<void> _executeDownload(DownloadItem item) async {
    item.status = DownloadStatus.downloading;
    notifyListeners();

    try {
      final dir = await getApplicationDocumentsDirectory();
      
      // Better extension detection
      String extension = 'mp4';
      try {
        final uri = Uri.parse(item.url);
        final path = uri.path.toLowerCase();
        if (path.endsWith('.ts')) extension = 'ts';
        else if (path.endsWith('.mkv')) extension = 'mkv';
        else if (path.endsWith('.avi')) extension = 'avi';
        else if (path.endsWith('.m3u8')) extension = 'ts'; // Treat HLS segments as TS for download if possible
      } catch (_) {}
      
      final fileName = '${item.type}_${item.id}.$extension';
      final savePath = '${dir.path}/downloads/$fileName';

      await Directory('${dir.path}/downloads').create(recursive: true);

      final cancelToken = CancelToken();
      _cancelTokens[item.id] = cancelToken;

      final origin = Uri.parse(item.url).origin;
      final options = Options(
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Referer': origin,
          'Origin': origin,
        },
        responseType: ResponseType.stream,
        followRedirects: true,
        validateStatus: (status) => status != null && status < 500,
      );

      await _dio.download(
        item.url,
        savePath,
        options: options,
        cancelToken: cancelToken,
        onReceiveProgress: (received, total) {
          if (total != -1) {
            item.progress = received / total;
            notifyListeners();
          }
        },
      );

      item.status = DownloadStatus.completed;
      item.filePath = savePath;
      _cancelTokens.remove(item.id);
    } catch (e) {
      _cancelTokens.remove(item.id);
      debugPrint('Download Error (${item.id}): $e');
      if (e is DioException && CancelToken.isCancel(e)) {
        item.status = DownloadStatus.pending; // Re-queue if cancelled
      } else {
        item.status = DownloadStatus.error;
      }
    }

    await _saveMetadata();
    _checkQueue();
    notifyListeners();
  }

  void retryDownload(int id, String type) {
    final index = _items.indexWhere((i) => i.id == id && i.type == type);
    if (index != -1 && _items[index].status == DownloadStatus.error) {
      _items[index].status = DownloadStatus.pending;
      _checkQueue();
      notifyListeners();
    }
  }

  Future<void> removeDownload(int id, String type) async {
    final index = _items.indexWhere((i) => i.id == id && i.type == type);
    if (index == -1) return;

    final item = _items[index];
    _cancelTokens[item.id]?.cancel();
    _cancelTokens.remove(item.id);

    if (item.filePath != null) {
      final file = File(item.filePath!);
      if (await file.exists()) {
        await file.delete();
      }
    }

    _items.removeAt(index);
    await _saveMetadata();
    _checkQueue();
    notifyListeners();
  }

  DownloadItem? getItem(int id, String type) {
    try {
      return _items.firstWhere((i) => i.id == id && i.type == type);
    } catch (_) {
      return null;
    }
  }

  bool isDownloaded(int id, String type) {
    return _items.any((i) => i.id == id && i.type == type && i.status == DownloadStatus.completed);
  }
}

final downloadService = DownloadService();
