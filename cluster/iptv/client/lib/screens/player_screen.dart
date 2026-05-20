import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:io';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import 'package:window_manager/window_manager.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../services/subtitle_settings.dart';
import '../services/progress_service.dart';
import '../services/language_service.dart';
import '../services/download_service.dart';
import '../services/api_service.dart';
import '../models/series_detail.dart';
import '../models/epg_program.dart';

class PlayerScreen extends StatefulWidget {
  final String name;
  final String url;
  final String? group;
  final String? type;
  final int? mediaId;
  final int? seriesId;
  final String? cover;
  final List<Episode>? episodes;
  final int? initialEpisodeIndex;
  final bool forceRestart;

  const PlayerScreen({
    super.key, 
    required this.name, 
    required this.url, 
    this.group, 
    this.type, 
    this.mediaId, 
    this.seriesId, 
    this.cover,
    this.episodes,
    this.initialEpisodeIndex,
    this.forceRestart = false,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final Player _player = Player();
  late final VideoController _ctrl = VideoController(
    _player,
    configuration: const VideoControllerConfiguration(
      enableHardwareAcceleration: true,
    ),
  );

  SubtitleSettings _subSettings = const SubtitleSettings();

  Timer? _progressTimer;
  bool _hasSeeked = false;
  double _playbackSpeed = 1.0;

  int? _currentEpisodeIndex;
  bool _showNextEpisodeSuggestion = false;

  final ValueNotifier<bool> _overlayVisible = ValueNotifier(true);
  Timer? _overlayTimer;
  int _lastPositionSeconds = -1;
  int _saveCount = 0;
  bool _isPip = false;

  StreamSubscription? _castSessionSubscription;
  StreamSubscription? _castSessionEndedSubscription;

  void _resetOverlayTimer() {
    if (!mounted || _isPip) return;
    _overlayVisible.value = true;
    _overlayTimer?.cancel();
    _overlayTimer = Timer(const Duration(seconds: 4), () {
      if (mounted) _overlayVisible.value = false;
    });
  }

  Future<void> _togglePip() async {
    if (!Platform.isLinux && !Platform.isWindows && !Platform.isMacOS) return;

    try {
      final newPip = !_isPip;
      
      if (newPip) {
        if (await windowManager.isFullScreen()) {
          await windowManager.setFullScreen(false);
        }
        
        await windowManager.setAlwaysOnTop(true);
        
        if (await windowManager.isMaximized()) {
          await windowManager.unmaximize();
        }

        await Future.delayed(const Duration(milliseconds: 100));
        await windowManager.setSize(const Size(480, 270));
        _overlayVisible.value = false;
      } else {
        await windowManager.setAlwaysOnTop(false);
        await windowManager.maximize();
        _resetOverlayTimer();
      }
      
      setState(() => _isPip = newPip);
    } catch (e) {
      debugPrint('PiP Error: $e');
    }
  }

  @override
  void initState() {
    super.initState();
    _currentEpisodeIndex = widget.initialEpisodeIndex;
    _resetOverlayTimer();
    _player.open(_buildMedia(_currentUrl));
    SubtitleSettings.load().then((s) { if (mounted) setState(() => _subSettings = s); });

    if (Platform.isAndroid || Platform.isIOS) {
      _castSessionSubscription = GoogleCastSessionManager.instance.currentSessionStream.listen((session) {
        if (session != null && GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected) {
          _player.pause();
          final remoteClient = GoogleCastRemoteMediaClient.instance;
          remoteClient.loadMedia(GoogleCastMediaInformation(
            contentId: _currentUrl,
            streamType: widget.type == 'live' ? CastMediaStreamType.live : CastMediaStreamType.buffered,
            contentType: widget.type == 'live' ? 'application/x-mpegURL' : 'video/mp4',
            metadata: GoogleCastMovieMediaMetadata(
              title: _currentName,
              subtitle: widget.group ?? '',
              images: _currentCover != null ? [GoogleCastImage(url: Uri.parse(_currentCover!))] : null,
            ),
          ));
        }
      });

      _castSessionEndedSubscription = GoogleCastSessionManager.instance.currentSessionStream.listen((session) {
        if (session == null && mounted) {
          _player.play();
        }
      });
    }

    _player.stream.duration.listen((duration) {
      if (!_hasSeeked && widget.type != null && widget.type != 'live' && duration.inSeconds > 0) {
        _hasSeeked = true;
        if (!widget.forceRestart) {
          _resumeProgress();
        }
      }
    });

    _player.stream.playing.listen((playing) {
      if (!playing) {
        ProgressService.syncToDisk();
        _overlayVisible.value = true;
        _overlayTimer?.cancel();
      } else {
        _resetOverlayTimer();
      }
    });

    _player.stream.position.listen((pos) {
      if (mounted && pos.inSeconds != _lastPositionSeconds) {
        _lastPositionSeconds = pos.inSeconds;
        _checkNextEpisodeSuggestion(pos);
      }
    });

    _player.stream.completed.listen((completed) {
      if (completed && mounted && _hasNextEpisode) {
        _playEpisode(_currentEpisodeIndex! + 1);
      }
    });

    if (widget.type != null && widget.type != 'live') {
      _progressTimer = Timer.periodic(const Duration(seconds: 15), (_) => _saveProgress());
    }
  }

  String get _currentUrl => (widget.episodes != null && _currentEpisodeIndex != null)
      ? widget.episodes![_currentEpisodeIndex!].url
      : widget.url;

  String get _currentName => (widget.episodes != null && _currentEpisodeIndex != null)
      ? widget.episodes![_currentEpisodeIndex!].title
      : widget.name;

  int? get _currentMediaId => (widget.episodes != null && _currentEpisodeIndex != null)
      ? widget.episodes![_currentEpisodeIndex!].id
      : widget.mediaId;

  String? get _currentCover => (widget.episodes != null && _currentEpisodeIndex != null)
      ? (widget.episodes![_currentEpisodeIndex!].cover ?? widget.cover)
      : widget.cover;

  bool get _hasNextEpisode => widget.episodes != null && 
      _currentEpisodeIndex != null && 
      _currentEpisodeIndex! + 1 < widget.episodes!.length;

  int _lastRemainingSeconds = -1;

  void _checkNextEpisodeSuggestion(Duration pos) {
    final dur = _player.state.duration;
    if (dur.inSeconds > 0 && _hasNextEpisode) {
      final remaining = dur - pos;
      final remSecs = remaining.inSeconds;
      final shouldShow = remSecs <= 40 && remSecs > 1;
      
      if (shouldShow != _showNextEpisodeSuggestion || (shouldShow && remSecs != _lastRemainingSeconds)) {
        setState(() {
          _showNextEpisodeSuggestion = shouldShow;
          _lastRemainingSeconds = remSecs;
        });
      }
    } else if (_showNextEpisodeSuggestion) {
      setState(() {
        _showNextEpisodeSuggestion = false;
        _lastRemainingSeconds = -1;
      });
    }
  }

  void _playEpisode(int index) {
    if (widget.episodes == null || index < 0 || index >= widget.episodes!.length) return;
    
    _saveProgress();
    
    setState(() {
      _currentEpisodeIndex = index;
      _showNextEpisodeSuggestion = false;
      _hasSeeked = false;
    });

    _player.open(_buildMedia(_currentUrl));
  }

  Future<void> _resumeProgress() async {
    final progress = await ProgressService.getProgress(_currentUrl);
    if (progress != null && !progress.isCompleted) {
      final target = Duration(seconds: progress.positionSeconds);
      await Future.delayed(const Duration(milliseconds: 800));
      _player.seek(target);
    }
  }

  void _saveProgress() {
    if (widget.type == null || widget.type == 'live' || _currentMediaId == null) return;
    
    final pos = _player.state.position;
    final dur = _player.state.duration;
    
    if (pos.inSeconds > 0) {
      _saveCount++;
      final shouldPersist = _saveCount >= 8; 
      if (shouldPersist) _saveCount = 0;

      ProgressService.saveProgress(MediaProgress(
        url: _currentUrl,
        title: _currentName,
        type: widget.type!,
        mediaId: _currentMediaId!,
        seriesId: widget.seriesId,
        cover: _currentCover,
        positionSeconds: pos.inSeconds,
        durationSeconds: dur.inSeconds,
        timestamp: DateTime.now().millisecondsSinceEpoch,
      ), persist: shouldPersist);
    }
  }

  Media _buildMedia(String url) {
    final download = downloadService.getItem(_currentMediaId ?? -1, widget.type ?? '');
    if (download != null && download.status == DownloadStatus.completed && download.filePath != null) {
      final file = File(download.filePath!);
      if (file.existsSync()) {
        return Media(download.filePath!);
      }
    }

    final origin = Uri.parse(url).origin;
    return Media(url, httpHeaders: {
      'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
          '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Referer': origin,
      'Origin':  origin,
    });
  }

  @override
  void dispose() {
    if (_isPip) {
      windowManager.setAlwaysOnTop(false);
      windowManager.maximize();
    }
    _overlayTimer?.cancel();
    _progressTimer?.cancel();
    _castSessionSubscription?.cancel();
    _castSessionEndedSubscription?.cancel();
    ProgressService.syncToDisk();
    _player.dispose();
    super.dispose();
  }

  SubtitleViewConfiguration get _subConfig => SubtitleViewConfiguration(
    style: _subSettings.textStyle,
  );

  void _showTrackSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (_) => _TrackSheet(
        tracks: _player.state.tracks,
        current: _player.state.track,
        subSettings: _subSettings,
        onAudio:       (t) => _player.setAudioTrack(t),
        onSubtitle:    (t) => _player.setSubtitleTrack(t),
        onSubSettings: (s) => setState(() => _subSettings = s),
      ),
    );
  }

  void _showCastPicker() {
    GoogleCastDiscoveryManager.instance.startDiscovery();
    showModalBottomSheet(
      context: context,
      useSafeArea: true,
      backgroundColor: const Color(0xFF1A0F2E),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) => SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Padding(
                padding: EdgeInsets.only(bottom: 10),
                child: Text('Sélectionner un appareil', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              ),
              StreamBuilder<List<GoogleCastDevice>>(
                stream: GoogleCastDiscoveryManager.instance.devicesStream,
                builder: (context, snapshot) {
                  final devices = snapshot.data ?? [];
                  if (devices.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.all(20),
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }
                  return ListView.builder(
                    shrinkWrap: true,
                    itemCount: devices.length,
                    itemBuilder: (context, index) {
                      final device = devices[index];
                      return ListTile(
                        leading: const Icon(Icons.cast, color: Colors.white),
                        title: Text(device.friendlyName, style: const TextStyle(color: Colors.white)),
                        subtitle: Text(device.modelName ?? '', style: const TextStyle(color: Colors.white70)),
                        onTap: () {
                          GoogleCastSessionManager.instance.startSessionWithDevice(device);
                          Navigator.pop(context);
                        },
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    ).then((_) => GoogleCastDiscoveryManager.instance.stopDiscovery());
  }

  @override
    Widget build(BuildContext context) {
    final bool isMobile = MediaQuery.of(context).size.width < 600;
    final bool isMobileDevice = Platform.isAndroid || Platform.isIOS;
    final EdgeInsets safePadding = MediaQuery.of(context).padding;

    final List<Widget> topBar = [
      IconButton(
        icon: const Icon(Icons.arrow_back, color: Colors.white),
        onPressed: () => Navigator.pop(context),
      ),
      const Icon(Icons.circle, size: 8, color: Color(0xFFFF4757)),
      const SizedBox(width: 12),
      Expanded(
        child: Text(
          _currentName,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(color: Colors.white, fontSize: isMobile ? 14 : 16, fontWeight: FontWeight.w600),
        ),
      ),
      if (widget.group != null && !isMobile) _GroupTag(group: widget.group!),
      if (widget.type != 'live') _RestartButton(player: _player),
      if (widget.type != 'live' && !isMobile) _SpeedButton(
        speed: _playbackSpeed,
        onSelected: (s) { setState(() => _playbackSpeed = s); _player.setRate(s); },
      ),
      if (isMobileDevice) 
        StreamBuilder<GoogleCastSession?>(
          stream: GoogleCastSessionManager.instance.currentSessionStream,
          builder: (context, snapshot) {
            final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
            return IconButton(
              icon: Icon(isConnected ? Icons.cast_connected : Icons.cast, color: isConnected ? const Color(0xFF9D4EDD) : Colors.white),
              onPressed: isConnected ? () => GoogleCastSessionManager.instance.endSessionAndStopCasting() : _showCastPicker,
            );
          },
        ),
      if (Platform.isLinux || Platform.isWindows || Platform.isMacOS)
        IconButton(
          icon: Icon(_isPip ? Icons.picture_in_picture_alt_rounded : Icons.picture_in_picture_rounded, color: Colors.white),
          tooltip: 'PiP',
          onPressed: _togglePip,
        ),
      _TrackButton(onTap: _showTrackSelector),
      const SizedBox(width: 8),
    ];

    final List<Widget> bottomBarMobile = [
      const MaterialPlayOrPauseButton(),
      const MaterialPositionIndicator(),
      const Spacer(),
      _ComboSelectorWrapper(player: _player, isMobile: true),
      const MaterialFullscreenButton(),
    ];

    final List<Widget> bottomBarDesktop = [
      const MaterialDesktopSkipPreviousButton(),
      const MaterialDesktopPlayOrPauseButton(),
      const MaterialDesktopSkipNextButton(),
      const MaterialDesktopVolumeButton(),
      const MaterialDesktopPositionIndicator(),
      const Spacer(),
      _ComboSelectorWrapper(player: _player),
      const MaterialDesktopFullscreenButton(),
    ];

    final List<Widget> centerButton = [
      if (widget.type != 'live') _SeekButton(player: _player, forward: false, isMobile: isMobile || isMobileDevice),
      if (widget.type != 'live') SizedBox(width: (isMobile || isMobileDevice) ? 20 : 40),
      _CenterPlayPause(player: _player, onTap: _resetOverlayTimer, isMobile: isMobile || isMobileDevice),
      if (widget.type != 'live') SizedBox(width: (isMobile || isMobileDevice) ? 20 : 40),
      if (widget.type != 'live') _SeekButton(player: _player, forward: true, isMobile: isMobile || isMobileDevice),
    ];

    final topMargin = isMobileDevice 
        ? EdgeInsets.only(top: safePadding.top > 0 ? safePadding.top : 16, left: safePadding.left, right: safePadding.right)
        : EdgeInsets.zero;
        
    final bottomMargin = isMobileDevice
        ? EdgeInsets.only(bottom: safePadding.bottom > 0 ? safePadding.bottom : 16, left: safePadding.left, right: safePadding.right)
        : EdgeInsets.zero;

    return Scaffold(
      backgroundColor: Colors.black,
      body: MaterialVideoControlsTheme(
        normal: MaterialVideoControlsThemeData(
          topButtonBar: topBar,
          topButtonBarMargin: topMargin,
          padding: (isMobile || isMobileDevice) ? const EdgeInsets.symmetric(horizontal: 8) : EdgeInsets.zero,
          primaryButtonBar: centerButton,
          bottomButtonBar: bottomBarMobile,
          bottomButtonBarMargin: bottomMargin,
        ),
        fullscreen: MaterialVideoControlsThemeData(
          topButtonBar: topBar,
          topButtonBarMargin: topMargin,
          padding: (isMobile || isMobileDevice) ? const EdgeInsets.symmetric(horizontal: 8) : EdgeInsets.zero,
          primaryButtonBar: centerButton,
          bottomButtonBar: bottomBarMobile,
          bottomButtonBarMargin: bottomMargin,
        ),
        child: MaterialDesktopVideoControlsTheme(
          normal: MaterialDesktopVideoControlsThemeData(
            topButtonBar: topBar,
            topButtonBarMargin: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            controlsHoverDuration: const Duration(seconds: 3),
            primaryButtonBar: centerButton,
            bottomButtonBar: bottomBarDesktop,
          ),
          fullscreen: MaterialDesktopVideoControlsThemeData(
            topButtonBar: topBar,
            topButtonBarMargin: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            controlsHoverDuration: const Duration(seconds: 3),
            primaryButtonBar: centerButton,
            bottomButtonBar: bottomBarDesktop,
          ),
          child: MouseRegion(
            onHover: (_) => _isPip ? null : _resetOverlayTimer(),
            onEnter: (_) => _isPip ? null : _resetOverlayTimer(),
            child: GestureDetector(
              onTap: _isPip ? _togglePip : _resetOverlayTimer,
              onPanUpdate: (_) => _isPip ? null : _resetOverlayTimer(),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Video(
                    key: ValueKey(_currentUrl),
                    controller: _ctrl,
                    controls: _isPip ? NoVideoControls : AdaptiveVideoControls,
                    subtitleViewConfiguration: _subConfig,
                  ),

                  if (!_isPip)
                    ValueListenableBuilder<bool>(
                      valueListenable: _overlayVisible,
                      builder: (context, visible, child) {
                        return IgnorePointer(
                          ignoring: !visible,
                          child: AnimatedOpacity(
                            opacity: visible ? 1.0 : 0.0,
                            duration: const Duration(milliseconds: 300),
                            child: child,
                          ),
                        );
                      },
                      child: Stack(
                        children: [
                          if (widget.type == 'live' && widget.mediaId != null)
                            Positioned(
                              bottom: 80,
                              left: 24,
                              child: _EpgWrapper(player: _player, mediaId: widget.mediaId!),
                            ),
                        ],
                      ),
                    ),

                  if (!_isPip && _hasNextEpisode)
                    _NextEpisodeWrapper(
                      player: _player,
                      nextEpisode: widget.episodes![_currentEpisodeIndex! + 1],
                      onPlay: () => _playEpisode(_currentEpisodeIndex! + 1),
                    ),
                  
                  if (_isPip)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: IconButton(
                        icon: const Icon(Icons.close_fullscreen_rounded, color: Colors.white70),
                        onPressed: _togglePip,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EpgOverlay extends StatelessWidget {
  final List<EpgProgram> epg;
  const _EpgOverlay({required this.epg});

  @override
  Widget build(BuildContext context) {
    final nowProg = epg.where((p) => p.isNow).firstOrNull;
    final nextProg = epg.where((p) {
      if (nowProg == null) return false;
      return p.start.isAtSameMomentAs(nowProg.stop) || p.start.isAfter(nowProg.start);
    }).where((p) => !p.isNow).firstOrNull;

    if (nowProg == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.black.withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.1)),
      ),
      constraints: const BoxConstraints(maxWidth: 350),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: const Color(0xFFFF4757), borderRadius: BorderRadius.circular(4)),
                child: Text(lang.t('epg_now'), style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900)),
              ),
              const SizedBox(width: 8),
              Expanded(child: Text(nowProg.title, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold), maxLines: 1, overflow: TextOverflow.ellipsis)),
            ],
          ),
          const SizedBox(height: 8),
          _ProgressBar(program: nowProg),
          if (nextProg != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Text('${lang.t('epg_next')} : ', style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 10, fontWeight: FontWeight.w900)),
                Expanded(child: Text(nextProg.title, style: const TextStyle(color: Colors.white70, fontSize: 13), maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _ProgressBar extends StatelessWidget {
  final EpgProgram program;
  const _ProgressBar({required this.program});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final total = program.stop.difference(program.start).inSeconds;
    final elapsed = now.difference(program.start).inSeconds;
    final double progress = (total > 0) ? (elapsed / total).clamp(0.0, 1.0) : 0.0;
    
    final startTime = '${program.start.hour.toString().padLeft(2, '0')}:${program.start.minute.toString().padLeft(2, '0')}';
    final endTime = '${program.stop.hour.toString().padLeft(2, '0')}:${program.stop.minute.toString().padLeft(2, '0')}';

    return Column(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 4,
            backgroundColor: Colors.white.withOpacity(0.1),
            color: const Color(0xFF9D4EDD),
          ),
        ),
        const SizedBox(height: 4),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(startTime, style: const TextStyle(color: Colors.white38, fontSize: 10)),
            Text(endTime, style: const TextStyle(color: Colors.white38, fontSize: 10)),
          ],
        ),
      ],
    );
  }
}

class _NextEpisodeOverlay extends StatelessWidget {
  final VoidCallback onTap;
  final VoidCallback onCancel;
  final Episode nextEpisode;
  final int remainingSeconds;

  const _NextEpisodeOverlay({
    required this.onTap, 
    required this.onCancel,
    required this.nextEpisode,
    required this.remainingSeconds,
  });

  @override
  Widget build(BuildContext context) {
    final double progress = (remainingSeconds / 40).clamp(0.0, 1.0);

    return Positioned(
      bottom: 110,
      right: 24,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          GestureDetector(
            onTap: onCancel,
            child: Container(
              margin: const EdgeInsets.only(bottom: 8, right: 4),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.close_rounded, size: 14, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(lang.t('cancel').toUpperCase(), 
                    style: const TextStyle(color: Colors.white70, fontSize: 9, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
                ],
              ),
            ),
          ),
          GestureDetector(
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF9D4EDD), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF9D4EDD).withOpacity(0.4),
                    blurRadius: 15,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 42, height: 42,
                        child: CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 3,
                          color: const Color(0xFFBB86FC),
                          backgroundColor: Colors.white.withOpacity(0.1),
                        ),
                      ),
                      Text(
                        '$remainingSeconds',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        lang.t('next_episode').toUpperCase(),
                        style: const TextStyle(
                          color: Color(0xFFBB86FC),
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        nextEpisode.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.play_arrow_rounded, color: Color(0xFFBB86FC), size: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _TrackSheet extends StatefulWidget {
  final Tracks tracks;
  final Track current;
  final SubtitleSettings subSettings;
  final void Function(AudioTrack) onAudio;
  final void Function(SubtitleTrack) onSubtitle;
  final ValueChanged<SubtitleSettings> onSubSettings;

  const _TrackSheet({
    required this.tracks,
    required this.current,
    required this.subSettings,
    required this.onAudio,
    required this.onSubtitle,
    required this.onSubSettings,
  });

  @override
  State<_TrackSheet> createState() => _TrackSheetState();
}

class _TrackSheetState extends State<_TrackSheet> {
  late SubtitleSettings _settings;
  AudioTrack?    _selAudio;
  SubtitleTrack? _selSubtitle;
  bool _showSettings = false;

  @override
  void initState() {
    super.initState();
    _settings    = widget.subSettings;
    _selAudio    = widget.current.audio;
    _selSubtitle = widget.current.subtitle;
  }

  void _update(SubtitleSettings s) {
    setState(() => _settings = s);
    widget.onSubSettings(s);
    s.save();
  }

  void _pickAudio(AudioTrack t) {
    setState(() => _selAudio = t);
    widget.onAudio(t);
  }

  void _pickSubtitle(SubtitleTrack t) {
    setState(() => _selSubtitle = t);
    widget.onSubtitle(t);
  }

  @override
  Widget build(BuildContext context) {
    final audioTracks    = widget.tracks.audio;
    final subtitleTracks = widget.tracks.subtitle;
    final double vh = MediaQuery.of(context).size.height;

    return Container(
      height: vh * 0.65,
      decoration: const BoxDecoration(
        color: Color(0xFF0C0714),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 12, 16, 12),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0x1AFFFFFF))),
            ),
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
                const SizedBox(width: 8),
                Text(
                  _showSettings ? lang.t('subtitle_appearance').toUpperCase() : lang.t('audio_subtitles').toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w900, letterSpacing: 1.2),
                ),
                const Spacer(),
                if (_showSettings)
                  TextButton(
                    onPressed: () => setState(() => _showSettings = false),
                    child: Text(lang.t('back'), style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 13, fontWeight: FontWeight.bold)),
                  ),
              ],
            ),
          ),

          Expanded(
            child: AnimatedSwitcher(
              duration: const Duration(milliseconds: 250),
              child: _showSettings 
                ? _buildAppearanceSettings() 
                : _buildTrackSelection(audioTracks, subtitleTracks),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTrackSelection(List<AudioTrack> audio, List<SubtitleTrack> subs) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(32, 24, 16, 12),
                child: Text(lang.t('audio_language').toUpperCase(), 
                  style: const TextStyle(color: Color(0x77FFFFFF), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
              ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: audio.length,
                  itemBuilder: (_, i) => _NetflixTile(
                    label: _audioLabel(audio[i]),
                    selected: _selAudio == audio[i],
                    onTap: () => _pickAudio(audio[i]),
                  ),
                ),
              ),
            ],
          ),
        ),
        Container(width: 1, color: const Color(0x1AFFFFFF), margin: const EdgeInsets.symmetric(vertical: 40)),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(32, 12, 16, 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(lang.t('subtitles').toUpperCase(), 
                      style: const TextStyle(color: Color(0x77FFFFFF), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
                    TextButton.icon(
                      onPressed: () => setState(() => _showSettings = true),
                      icon: const Icon(Icons.settings_outlined, size: 16, color: Color(0xFFBB86FC)),
                      label: Text(lang.t('settings'), style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    _NetflixTile(
                      label: lang.t('subtitles_disabled'),
                      selected: _selSubtitle == SubtitleTrack.no(),
                      onTap: () => _pickSubtitle(SubtitleTrack.no()),
                    ),
                    ...subs
                      .where((t) => t != SubtitleTrack.auto() && t != SubtitleTrack.no())
                      .map((t) => _NetflixTile(
                        label: _subtitleLabel(t),
                        selected: _selSubtitle == t,
                        onTap: () => _pickSubtitle(t),
                      )),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildAppearanceSettings() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SettingGroup(
            label: lang.t('color'),
            children: [
              _ModernChip(
                label: lang.t('white'),
                selected: _settings.color == SubtitleColor.white,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.white)),
              ),
              _ModernChip(
                label: lang.t('yellow'),
                dotColor: const Color(0xFFFFE000),
                selected: _settings.color == SubtitleColor.yellow,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.yellow)),
              ),
            ],
          ),
          const SizedBox(height: 32),
          _SettingGroup(
            label: lang.t('background'),
            children: [
              _ModernChip(
                label: lang.t('none'),
                selected: _settings.background == SubtitleBackground.none,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.none)),
              ),
              _ModernChip(
                label: lang.t('dark'),
                selected: _settings.background == SubtitleBackground.dark,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.dark)),
              ),
            ],
          ),
          const SizedBox(height: 32),
          _SettingGroup(
            label: lang.t('size'),
            children: [
              _ModernChip(label: lang.t('small'), selected: _settings.size == SubtitleSize.small, onTap: () => _update(_settings.copyWith(size: SubtitleSize.small))),
              _ModernChip(label: lang.t('medium'), selected: _settings.size == SubtitleSize.medium, onTap: () => _update(_settings.copyWith(size: SubtitleSize.medium))),
              _ModernChip(label: lang.t('large'), selected: _settings.size == SubtitleSize.large, onTap: () => _update(_settings.copyWith(size: SubtitleSize.large))),
            ],
          ),
          const SizedBox(height: 40),
          Text(lang.t('subtitle_preview').toUpperCase(), style: const TextStyle(color: Color(0x77FFFFFF), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 24),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0x1AFFFFFF)),
            ),
            child: Center(
              child: Text(
                lang.t('subtitle_preview'),
                style: _settings.textStyle.copyWith(
                  fontSize: (_settings.fontSize * 0.33).clamp(14.0, 24.0),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _audioLabel(AudioTrack t) {
    if (t == AudioTrack.auto()) return lang.t('auto');
    if (t == AudioTrack.no())   return lang.t('mute');
    final langCode  = t.language?.toUpperCase();
    final title = t.title;
    if (langCode != null && title != null) return '$langCode — $title';
    return langCode ?? title ?? '${lang.t('track')} ${t.id}';
  }

  String _subtitleLabel(SubtitleTrack t) {
    final langCode  = t.language?.toUpperCase();
    final title = t.title;
    if (langCode != null && title != null) return '$langCode — $title';
    return langCode ?? title ?? '${lang.t('track')} ${t.id}';
  }
}

class _NetflixTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _NetflixTile({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 2),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFBB86FC).withOpacity(0.1) : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            if (selected)
              const Icon(Icons.check_rounded, color: Color(0xFFBB86FC), size: 20)
            else
              const SizedBox(width: 20),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: selected ? Colors.white : const Color(0xFFB0AEC8),
                  fontSize: 15,
                  fontWeight: selected ? FontWeight.w800 : FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SettingGroup extends StatelessWidget {
  final String label;
  final List<Widget> children;
  const _SettingGroup({required this.label, required this.children});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Color(0x77FFFFFF), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
        const SizedBox(height: 16),
        Wrap(spacing: 12, runSpacing: 12, children: children),
      ],
    );
  }
}

class _ModernChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? dotColor;

  const _ModernChip({required this.label, required this.selected, required this.onTap, this.dotColor});

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      decoration: BoxDecoration(
        color: selected ? const Color(0xFF9D4EDD) : const Color(0xFF1F1235),
        borderRadius: BorderRadius.circular(30),
        boxShadow: selected ? [BoxShadow(color: const Color(0xFF9D4EDD).withOpacity(0.4), blurRadius: 10, spreadRadius: 1)] : [],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(30),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (dotColor != null)
                  Container(width: 8, height: 8, margin: const EdgeInsets.only(right: 8), decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle)),
                Text(label, style: TextStyle(color: selected ? Colors.white : const Color(0xFFB0AEC8), fontSize: 13, fontWeight: FontWeight.w700)),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _GroupTag extends StatelessWidget {
  final String group;
  const _GroupTag({required this.group});
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 8),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0x449D4EDD),
        borderRadius: BorderRadius.circular(5),
        border: Border.all(color: const Color(0x779D4EDD)),
      ),
      child: Text(group, style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 12)),
    ),
  );
}

class _SpeedButton extends StatelessWidget {
  final double speed;
  final ValueChanged<double> onSelected;
  const _SpeedButton({required this.speed, required this.onSelected});
  @override
  Widget build(BuildContext context) => PopupMenuButton<double>(
    icon: const Icon(Icons.speed_rounded, color: Colors.white),
    tooltip: lang.t('playback_speed'),
    color: const Color(0xFF1A0F2E),
    offset: const Offset(0, 40),
    initialValue: speed,
    onSelected: onSelected,
    itemBuilder: (_) => [
      PopupMenuItem(value: 1.0, child: Text(lang.t('speed_normal'), style: const TextStyle(color: Colors.white))),
      const PopupMenuItem(value: 1.25, child: Text('1.25x', style: TextStyle(color: Colors.white))),
      const PopupMenuItem(value: 1.5, child: Text('1.5x', style: TextStyle(color: Colors.white))),
      const PopupMenuItem(value: 2.0, child: Text('2.0x', style: TextStyle(color: Colors.white))),
    ],
  );
}

class _TrackButton extends StatelessWidget {
  final VoidCallback onTap;
  const _TrackButton({required this.onTap});
  @override
  Widget build(BuildContext context) => IconButton(
    icon: const Icon(Icons.tune_rounded, color: Colors.white),
    tooltip: lang.t('audio_subtitles'),
    onPressed: onTap,
  );
}

class _ComboSelector extends StatelessWidget {
  final Tracks tracks;
  final Track currentTrack;
  final void Function(AudioTrack, SubtitleTrack) onSelect;
  final bool isMobile;

  const _ComboSelector({
    required this.tracks,
    required this.currentTrack,
    required this.onSelect,
    this.isMobile = false,
  });

  bool _isFrench(String? lang) {
    if (lang == null) return false;
    final l = lang.toLowerCase();
    return l.contains('fr') || l == 'fre' || l == 'fra' || l.contains('vf');
  }

  @override
  Widget build(BuildContext context) {
    final audioList = tracks.audio.where((a) => a.id != 'auto' && a.id != 'no').toList();
    final subList = tracks.subtitle.where((s) => s.id != 'auto' && s.id != 'no').toList();

    if (audioList.isEmpty) return const SizedBox.shrink();

    AudioTrack? vfAudio;
    AudioTrack? voAudio;
    SubtitleTrack? frSub;

    for (final a in audioList) {
      if (_isFrench(a.language) || _isFrench(a.title)) {
        vfAudio ??= a;
      } else {
        voAudio ??= a;
      }
    }

    final frenchSubs = subList.where((s) => _isFrench(s.language) || _isFrench(s.title)).toList();
    if (frenchSubs.isNotEmpty) {
      frSub = frenchSubs.length > 1 ? frenchSubs[1] : frenchSubs.first;
    }

    final noSub = SubtitleTrack.no();
    final combos = <String, void Function()>{};

    if (vfAudio != null) {
      combos['VF'] = () => onSelect(vfAudio!, noSub);
    }
    if (voAudio != null && frSub != null) {
      combos['VOSTFR'] = () => onSelect(voAudio!, frSub!);
    }
    if (voAudio != null) {
      combos['VO'] = () => onSelect(voAudio!, noSub);
    }

    if (combos.length <= 1) {
      combos.clear();
      if (audioList.length == 1 && subList.isNotEmpty) {
        combos['AUDIO'] = () => onSelect(audioList.first, noSub);
        combos['AUDIO+ST'] = () => onSelect(audioList.first, subList.first);
      } else if (audioList.length >= 2) {
        combos['AUDIO 1'] = () => onSelect(audioList[0], noSub);
        combos['AUDIO 2'] = () => onSelect(audioList[1], noSub);
        if (subList.isNotEmpty) {
          combos['A1+ST'] = () => onSelect(audioList[0], subList.first);
        }
      }
    }

    if (combos.length < 2) return const SizedBox.shrink();

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: combos.entries.map((e) {
        final isSelected = currentTrack.audio == (e.key.contains('2') && audioList.length > 1 ? audioList[1] : (e.key.contains('VF') ? vfAudio : (voAudio ?? audioList.first))) &&
                           currentTrack.subtitle == (e.key.contains('ST') ? (frSub ?? subList.first) : noSub);
                           
        return Padding(
          padding: EdgeInsets.symmetric(horizontal: isMobile ? 3.0 : 6.0),
          child: TextButton(
            style: TextButton.styleFrom(
              padding: EdgeInsets.symmetric(horizontal: isMobile ? 12 : 24, vertical: isMobile ? 8 : 12),
              backgroundColor: isSelected ? const Color(0xFF9D4EDD) : const Color(0xFFBB86FC).withOpacity(0.15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(isMobile ? 12 : 16),
                side: BorderSide(color: isSelected ? Colors.transparent : const Color(0x44BB86FC), width: 1.5),
              ),
              minimumSize: Size(isMobile ? 60 : 80, isMobile ? 36 : 48),
            ),
            onPressed: e.value,
            child: Text(
              e.key, 
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFFBB86FC), 
                fontSize: isMobile ? 12 : 16, 
                fontWeight: FontWeight.w900, 
                letterSpacing: 1.0
              )
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ComboSelectorWrapper extends StatelessWidget {
  final Player player;
  final bool isMobile;
  const _ComboSelectorWrapper({required this.player, this.isMobile = false});
  @override
  Widget build(BuildContext context) {
    return StreamBuilder<Tracks>(
      stream: player.stream.tracks,
      builder: (context, snapshot) {
        return StreamBuilder<Track>(
          stream: player.stream.track,
          builder: (context, snapshot2) {
            return _ComboSelector(
              tracks: player.state.tracks,
              currentTrack: player.state.track,
              isMobile: isMobile,
              onSelect: (a, s) {
                player.setAudioTrack(a);
                player.setSubtitleTrack(s);
              },
            );
          },
        );
      },
    );
  }
}

class _EpgWrapper extends StatefulWidget {
  final Player player;
  final int mediaId;
  const _EpgWrapper({required this.player, required this.mediaId});
  @override
  State<_EpgWrapper> createState() => _EpgWrapperState();
}

class _EpgWrapperState extends State<_EpgWrapper> {
  List<EpgProgram>? _epg;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _fetch();
    _timer = Timer.periodic(const Duration(minutes: 2), (_) => _fetch());
  }

  @override
  void dispose() { _timer?.cancel(); super.dispose(); }

  Future<void> _fetch() async {
    try {
      final epg = await ApiService().fetchShortEpg(widget.mediaId);
      if (mounted) setState(() => _epg = epg);
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    if (_epg == null || _epg!.isEmpty) return const SizedBox.shrink();
    return _EpgOverlay(epg: _epg!);
  }
}

class _NextEpisodeWrapper extends StatefulWidget {
  final Player player;
  final Episode nextEpisode;
  final VoidCallback onPlay;
  const _NextEpisodeWrapper({required this.player, required this.nextEpisode, required this.onPlay});
  @override
  State<_NextEpisodeWrapper> createState() => _NextEpisodeWrapperState();
}

class _NextEpisodeWrapperState extends State<_NextEpisodeWrapper> {
  bool _show = false;
  int _rem = -1;
  StreamSubscription? _sub;

  @override
  void initState() {
    super.initState();
    _sub = widget.player.stream.position.listen((pos) {
      if (!mounted) return;
      final dur = widget.player.state.duration;
      if (dur.inSeconds > 0) {
        final r = (dur - pos).inSeconds;
        final s = r <= 40 && r > 1;
        if (s != _show || (s && r != _rem)) {
          setState(() { _show = s; _rem = r; });
        }
      } else if (_show) { setState(() => _show = false); }
    });
  }

  @override
  void dispose() { _sub?.cancel(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    if (!_show) return const SizedBox.shrink();
    return _NextEpisodeOverlay(
      onTap: widget.onPlay,
      onCancel: () { setState(() => _show = false); _sub?.cancel(); },
      nextEpisode: widget.nextEpisode,
      remainingSeconds: _rem,
    );
  }
}

class _CenterPlayPause extends StatelessWidget {
  final Player player;
  final VoidCallback? onTap;
  final bool isMobile;
  const _CenterPlayPause({required this.player, this.onTap, this.isMobile = false});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<bool>(
      stream: player.stream.playing,
      builder: (context, snapshot) {
        final isPlaying = snapshot.data ?? false;
        final double size = isMobile ? 48 : 64;
        final double padding = isMobile ? 16 : 24;
        
        return Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: () {
              player.playOrPause();
              onTap?.call();
            },
            customBorder: const CircleBorder(),
            child: Container(
              padding: EdgeInsets.all(padding),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF9D4EDD).withOpacity(0.15),
                border: Border.all(color: const Color(0xFF9D4EDD).withOpacity(0.25), width: 2),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF9D4EDD).withOpacity(0.1),
                    blurRadius: 25,
                    spreadRadius: 8,
                  ),
                ],
              ),
              child: Icon(
                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                size: size,
                color: Colors.white,
              ),
            ),
          ),
        );
      },
    );
  }
}

class _SeekButton extends StatelessWidget {
  final Player player;
  final bool forward;
  final bool isMobile;
  const _SeekButton({required this.player, required this.forward, this.isMobile = false});

  @override
  Widget build(BuildContext context) {
    final double iconSize = isMobile ? 24 : 32;
    final double padding = isMobile ? 12 : 16;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () {
          final pos = player.state.position;
          final delta = Duration(seconds: forward ? 10 : -10);
          player.seek(pos + delta);
        },
        customBorder: const CircleBorder(),
        child: Container(
          padding: EdgeInsets.all(padding),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: Colors.white.withOpacity(0.05),
            border: Border.all(color: Colors.white.withOpacity(0.1), width: 1),
          ),
          child: Icon(
            forward ? Icons.forward_10_rounded : Icons.replay_10_rounded,
            color: Colors.white,
            size: iconSize,
          ),
        ),
      ),
    );
  }
}

class _RestartButton extends StatelessWidget {
  final Player player;
  const _RestartButton({required this.player});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.restart_alt_rounded, color: Colors.white),
      tooltip: lang.t('restart_from_beginning'),
      onPressed: () => player.seek(Duration.zero),
    );
  }
}
