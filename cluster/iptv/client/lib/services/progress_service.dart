import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class MediaProgress {
  final String url;
  final String title;
  final String type; // 'movie' or 'series'
  final int mediaId; // movie ID or episode ID
  final int? seriesId;
  final String? cover;
  final int positionSeconds;
  final int durationSeconds;
  final int timestamp;

  MediaProgress({
    required this.url,
    required this.title,
    required this.type,
    required this.mediaId,
    this.seriesId,
    this.cover,
    required this.positionSeconds,
    required this.durationSeconds,
    required this.timestamp,
  });

  bool get isCompleted => durationSeconds > 0 && positionSeconds > (durationSeconds * 0.9);

  Map<String, dynamic> toJson() => {
    'url': url,
    'title': title,
    'type': type,
    'mediaId': mediaId,
    if (seriesId != null) 'seriesId': seriesId,
    if (cover != null) 'cover': cover,
    'positionSeconds': positionSeconds,
    'durationSeconds': durationSeconds,
    'timestamp': timestamp,
  };

  factory MediaProgress.fromJson(Map<String, dynamic> j) => MediaProgress(
    url: j['url'] as String,
    title: j['title'] as String,
    type: j['type'] as String,
    mediaId: j['mediaId'] as int,
    seriesId: j['seriesId'] as int?,
    cover: j['cover'] as String?,
    positionSeconds: j['positionSeconds'] as int,
    durationSeconds: j['durationSeconds'] as int,
    timestamp: j['timestamp'] as int,
  );
}

class ProgressService {
  static const String _key = 'media_progress_cache';
  static List<MediaProgress>? _cache;
  static bool _isDirty = false;

  static Future<List<MediaProgress>> getAll({bool force = false}) async {
    if (!force && _cache != null) return _cache!;
    final prefs = await SharedPreferences.getInstance();
    final List<String> items = prefs.getStringList(_key) ?? [];
    _cache = items.map((e) => MediaProgress.fromJson(json.decode(e) as Map<String, dynamic>)).toList();
    return _cache!;
  }

  /// Updates progress in memory and optionally persists to disk.
  static Future<void> saveProgress(MediaProgress progress, {bool persist = false}) async {
    if (progress.type == 'live') return;
    
    final all = await getAll();
    final index = all.indexWhere((p) => p.url == progress.url);
    if (index >= 0) {
      all[index] = progress;
    } else {
      all.add(progress);
    }
    
    _cache = all;
    _isDirty = true;

    if (persist) {
      await syncToDisk();
    }
  }

  /// Physically writes the memory cache to the disk.
  static Future<void> syncToDisk() async {
    if (!_isDirty || _cache == null) return;
    
    final all = _cache!;
    // Sort and limit
    all.sort((a, b) => b.timestamp.compareTo(a.timestamp));
    if (all.length > 100) {
      all.removeRange(100, all.length);
    }

    final jsonList = all.map((e) => json.encode(e.toJson())).toList();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, jsonList);
    _isDirty = false;
  }

  static Future<void> removeByMediaId(int mediaId, String type) async {
    final all = await getAll();
    all.removeWhere((p) => p.mediaId == mediaId && p.type == type);
    _cache = all;
    _isDirty = true;
    await syncToDisk();
  }

  static Future<void> removeBySeriesId(int seriesId) async {
    final all = await getAll();
    all.removeWhere((p) => p.seriesId == seriesId && p.type == 'series');
    _cache = all;
    _isDirty = true;
    await syncToDisk();
  }

  static Future<MediaProgress?> getProgress(String url) async {
    final all = await getAll();
    try {
      return all.firstWhere((p) => p.url == url);
    } catch (_) {
      return null;
    }
  }
}
