import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import 'progress_service.dart';

class CastProgressTracker {
  static final CastProgressTracker instance = CastProgressTracker._internal();
  CastProgressTracker._internal();

  StreamSubscription? _posSubscription;
  StreamSubscription? _statusSubscription;
  String? _currentUrl;

  void init() {
    if (!Platform.isAndroid && !Platform.isIOS) return;

    _statusSubscription = GoogleCastRemoteMediaClient.instance.mediaStatusStream.listen((status) {
      if (status == null) return;
      _currentUrl = status.mediaInformation?.contentId;
      
      // Stop tracking if idle
      if (status.playerState == CastMediaPlayerState.idle) {
        _posSubscription?.cancel();
        _posSubscription = null;
      } else if (_posSubscription == null && _currentUrl != null) {
        _startTracking();
      }
    });
  }

  void _startTracking() {
    _posSubscription?.cancel();
    int saveCount = 0;

    _posSubscription = GoogleCastRemoteMediaClient.instance.playerPositionStream.listen((pos) async {
      if (_currentUrl == null) return;
      
      // Only save every 15 seconds to avoid spamming disk
      saveCount++;
      if (saveCount >= 15) {
        saveCount = 0;
        
        final existing = await ProgressService.getProgress(_currentUrl!);
        if (existing != null) {
          final status = GoogleCastRemoteMediaClient.instance.mediaStatus;
          final dur = status?.mediaInformation?.duration?.inSeconds ?? existing.durationSeconds;
          
          if (pos.inSeconds > 0 && dur > 0) {
            ProgressService.saveProgress(MediaProgress(
              url: existing.url,
              title: existing.title,
              type: existing.type,
              mediaId: existing.mediaId,
              seriesId: existing.seriesId,
              cover: existing.cover,
              positionSeconds: pos.inSeconds,
              durationSeconds: dur,
              timestamp: DateTime.now().millisecondsSinceEpoch,
            ), persist: true);
          }
        }
      }
    });
  }
}
