import 'package:flutter/material.dart';
import 'dart:async';
import 'dart:io';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../services/subtitle_settings.dart';
import '../services/progress_service.dart';
import '../services/language_service.dart';
import '../services/download_service.dart';
import '../models/series_detail.dart';

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
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final Player _player = Player();
  late final VideoController _ctrl = VideoController(_player);

  Tracks _tracks = const Tracks();
  Track  _track  = const Track();
  SubtitleSettings _subSettings = const SubtitleSettings();

  Timer? _progressTimer;
  bool _hasSeeked = false;
  double _playbackSpeed = 1.0;

  int? _currentEpisodeIndex;
  bool _showNextEpisodeSuggestion = false;

  bool _showOverlay = true;
  Timer? _overlayTimer;

  void _resetOverlayTimer() {
    if (!mounted) return;
    if (!_showOverlay) setState(() => _showOverlay = true);
    _overlayTimer?.cancel();
    _overlayTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) setState(() => _showOverlay = false);
    });
  }

  @override
  void initState() {
    super.initState();
    _currentEpisodeIndex = widget.initialEpisodeIndex;
    _resetOverlayTimer();
    _player.open(_buildMedia(_currentUrl));
    _player.stream.tracks.listen((t) { if (mounted) setState(() => _tracks = t); });
    _player.stream.track.listen((t)  { if (mounted) setState(() => _track  = t); });
    SubtitleSettings.load().then((s) { if (mounted) setState(() => _subSettings = s); });

    _player.stream.duration.listen((duration) {
      if (!_hasSeeked && widget.type != null && widget.type != 'live' && duration.inSeconds > 0) {
        _hasSeeked = true;
        _resumeProgress();
      }
    });

    _player.stream.position.listen((pos) {
      if (mounted) _checkNextEpisodeSuggestion(pos);
    });

    _player.stream.completed.listen((completed) {
      if (completed && mounted && _hasNextEpisode) {
        _playEpisode(_currentEpisodeIndex! + 1);
      }
    });

    if (widget.type != null && widget.type != 'live') {
      _progressTimer = Timer.periodic(const Duration(seconds: 5), (_) => _saveProgress());
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

    // On récupère l'URL mise à jour via le getter qui utilise _currentEpisodeIndex
    _player.open(_buildMedia(_currentUrl));
  }

  Future<void> _resumeProgress() async {
    final progress = await ProgressService.getProgress(_currentUrl);
    if (progress != null && !progress.isCompleted) {
      final target = Duration(seconds: progress.positionSeconds);
      // Attend que le lecteur soit prêt à recevoir le seek
      await Future.delayed(const Duration(milliseconds: 800));
      _player.seek(target);
    }
  }

  void _saveProgress() {
    if (widget.type == null || widget.type == 'live' || _currentMediaId == null) return;
    
    final pos = _player.state.position;
    final dur = _player.state.duration;
    
    if (pos.inSeconds > 0) {
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
      ));
    }
  }

  // HLS streams (TF1, M6, France TV…) validate User-Agent and sometimes
  // Referer. Passing a browser UA dramatically increases playback success.
  Media _buildMedia(String url) {
    // Check if we have a local version
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
    _overlayTimer?.cancel();
    _progressTimer?.cancel();
    _saveProgress();
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
        tracks: _tracks,
        current: _track,
        subSettings: _subSettings,
        onAudio:       (t) => _player.setAudioTrack(t),
        onSubtitle:    (t) => _player.setSubtitleTrack(t),
        onSubSettings: (s) => setState(() => _subSettings = s),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final topBar = [
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
          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      if (widget.group != null) _GroupTag(group: widget.group!),
      if (widget.type != 'live') _SpeedButton(
        speed: _playbackSpeed,
        onSelected: (s) { setState(() => _playbackSpeed = s); _player.setRate(s); },
      ),
      _TrackButton(onTap: _showTrackSelector),
      const SizedBox(width: 8),
    ];

    return Scaffold(
      backgroundColor: Colors.black,
      body: MaterialVideoControlsTheme(
        normal: MaterialVideoControlsThemeData(
          topButtonBar: topBar,
          topButtonBarMargin: EdgeInsets.zero,
          padding: EdgeInsets.zero,
          bottomButtonBar: const [
            MaterialPlayOrPauseButton(),
            MaterialPositionIndicator(),
            Spacer(),
            MaterialFullscreenButton(),
          ],
        ),
        fullscreen: MaterialVideoControlsThemeData(
          topButtonBar: topBar,
          topButtonBarMargin: EdgeInsets.zero,
          padding: EdgeInsets.zero,
          bottomButtonBar: const [
            MaterialPlayOrPauseButton(),
            MaterialPositionIndicator(),
            Spacer(),
            MaterialFullscreenButton(),
          ],
        ),
        child: MaterialDesktopVideoControlsTheme(
          normal: MaterialDesktopVideoControlsThemeData(
            topButtonBar: topBar,
            topButtonBarMargin: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            controlsHoverDuration: const Duration(seconds: 3),
            bottomButtonBar: const [
              MaterialDesktopPlayOrPauseButton(),
              MaterialDesktopPositionIndicator(),
              Spacer(),
              MaterialDesktopFullscreenButton(),
            ],
          ),
          fullscreen: MaterialDesktopVideoControlsThemeData(
            topButtonBar: topBar,
            topButtonBarMargin: EdgeInsets.zero,
            padding: EdgeInsets.zero,
            controlsHoverDuration: const Duration(seconds: 3),
            bottomButtonBar: const [
              MaterialDesktopPlayOrPauseButton(),
              MaterialDesktopPositionIndicator(),
              Spacer(),
              MaterialDesktopFullscreenButton(),
            ],
          ),
          child: MouseRegion(
            onHover: (_) => _resetOverlayTimer(),
            child: GestureDetector(
              onTap: _resetOverlayTimer,
              onPanUpdate: (_) => _resetOverlayTimer(),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  Video(
                    key: ValueKey(_currentUrl),
                    controller: _ctrl,
                    controls: AdaptiveVideoControls,
                    subtitleViewConfiguration: _subConfig,
                  ),
                  // Combo Buttons Overlay
                  Positioned(
                    bottom: 80,
                    right: 24,
                    child: IgnorePointer(
                      ignoring: !_showOverlay,
                      child: AnimatedOpacity(
                        opacity: _showOverlay ? 1.0 : 0.0,
                        duration: const Duration(milliseconds: 300),
                        child: _ComboSelector(
                          tracks: _tracks,
                          currentTrack: _track,
                          onSelect: (a, s) {
                            _player.setAudioTrack(a);
                            _player.setSubtitleTrack(s);
                            _resetOverlayTimer();
                          },
                        ),
                      ),
                    ),
                  ),
                  // Center Play/Pause button
              StreamBuilder<bool>(
                stream: _player.stream.playing,
                builder: (context, snapshot) {
                  final isPlaying = snapshot.data ?? false;
                  return GestureDetector(
                    onTap: () => _player.playOrPause(),
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: const BoxDecoration(
                        color: Colors.black26,
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                        size: 80,
                        color: Colors.white.withValues(alpha: 0.7),
                      ),
                    ),
                  );
                },
              ),

              if (_showNextEpisodeSuggestion)
                _NextEpisodeOverlay(
                  onTap: () => _playEpisode(_currentEpisodeIndex! + 1),
                  onCancel: () => setState(() => _showNextEpisodeSuggestion = false),
                  nextEpisode: widget.episodes![_currentEpisodeIndex! + 1],
                  remainingSeconds: (_player.state.duration - _player.state.position).inSeconds,
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
    // Max duration for the countdown is 40s
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
                color: Colors.black.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF9D4EDD), width: 1.5),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF9D4EDD).withValues(alpha: 0.4),
                    blurRadius: 15,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Stylish Countdown Circle
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      SizedBox(
                        width: 42, height: 42,
                        child: CircularProgressIndicator(
                          value: progress,
                          strokeWidth: 3,
                          color: const Color(0xFFBB86FC),
                          backgroundColor: Colors.white.withValues(alpha: 0.1),
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
          // Header
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
        // Audio Column
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
        // Divider
        Container(width: 1, color: const Color(0x1AFFFFFF), margin: const EdgeInsets.symmetric(vertical: 40)),
        // Subtitles Column
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
          // Preview
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
          color: selected ? const Color(0xFFBB86FC).withValues(alpha: 0.1) : Colors.transparent,
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
        boxShadow: selected ? [BoxShadow(color: const Color(0xFF9D4EDD).withValues(alpha: 0.4), blurRadius: 10, spreadRadius: 1)] : [],
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
    icon: const Icon(Icons. tune_rounded, color: Colors.white),
    tooltip: lang.t('audio_subtitles'),
    onPressed: onTap,
  );
}

class _ComboSelector extends StatelessWidget {
  final Tracks tracks;
  final Track currentTrack;
  final void Function(AudioTrack, SubtitleTrack) onSelect;

  const _ComboSelector({
    required this.tracks,
    required this.currentTrack,
    required this.onSelect,
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

    // Fallback: If no combos were detected (or only one), but there are multiple tracks.
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
          padding: const EdgeInsets.symmetric(horizontal: 4.0),
          child: TextButton(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
              backgroundColor: isSelected ? const Color(0xFF9D4EDD) : const Color(0xFFBB86FC).withValues(alpha: 0.1),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: BorderSide(color: isSelected ? Colors.transparent : const Color(0x33BB86FC)),
              ),
              minimumSize: const Size(0, 32),
            ),
            onPressed: e.value,
            child: Text(e.key, style: TextStyle(color: isSelected ? Colors.white : const Color(0xFFBB86FC), fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.5)),
          ),
        );
      }).toList(),
    );
  }
}

