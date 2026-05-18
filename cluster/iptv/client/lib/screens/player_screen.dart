import 'package:flutter/material.dart';
import 'dart:async';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../services/subtitle_settings.dart';
import '../services/progress_service.dart';
import '../services/language_service.dart';
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

  @override
  void initState() {
    super.initState();
    _currentEpisodeIndex = widget.initialEpisodeIndex;
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

  void _checkNextEpisodeSuggestion(Duration pos) {
    final dur = _player.state.duration;
    if (dur.inSeconds > 0 && _hasNextEpisode) {
      final remaining = dur - pos;
      // Show suggestion in the last 40 seconds
      final shouldShow = remaining.inSeconds <= 40 && remaining.inSeconds > 2;
      if (shouldShow != _showNextEpisodeSuggestion) {
        setState(() => _showNextEpisodeSuggestion = shouldShow);
      }
    } else if (_showNextEpisodeSuggestion) {
      setState(() => _showNextEpisodeSuggestion = false);
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
      backgroundColor: const Color(0xFF1A0F2E),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
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
          ),
          child: Stack(
            alignment: Alignment.center,
            children: [
              Video(
                controller: _ctrl,
                controls: AdaptiveVideoControls,
                subtitleViewConfiguration: _subConfig,
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
                  nextEpisode: widget.episodes![_currentEpisodeIndex! + 1],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NextEpisodeOverlay extends StatelessWidget {
  final VoidCallback onTap;
  final Episode nextEpisode;

  const _NextEpisodeOverlay({required this.onTap, required this.nextEpisode});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 100,
      right: 24,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.8),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF9D4EDD), width: 1.5),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFF9D4EDD).withValues(alpha: 0.3),
                blurRadius: 10,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.skip_next_rounded, color: Color(0xFFBB86FC), size: 28),
              const SizedBox(width: 12),
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
                  const SizedBox(height: 2),
                  Text(
                    nextEpisode.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 8),
            ],
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

// ─── Track + subtitle settings sheet ─────────────────────────────────────────
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

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle + Terminé button
          Row(
            children: [
              const Spacer(),
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Spacer(),
              GestureDetector(
                onTap: () => Navigator.pop(context),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
                  decoration: BoxDecoration(
                    color: const Color(0xFF9D4EDD),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(lang.t('done'), style: const TextStyle(
                    color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700,
                  )),
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // ── Audio ─────────────────────────────────────────────────────────
          if (audioTracks.length > 1) ...[
            _SectionHeader(icon: Icons.volume_up_rounded, label: lang.t('audio_language')),
            const SizedBox(height: 8),
            ...audioTracks.map((t) => _TrackTile(
              label: _audioLabel(t),
              selected: _selAudio == t,
              onTap: () => _pickAudio(t),
            )),
            const SizedBox(height: 20),
          ],

          // ── Subtitle track ────────────────────────────────────────────────
          if (subtitleTracks.length > 1) ...[
            _SectionHeader(icon: Icons.subtitles_rounded, label: lang.t('subtitles')),
            const SizedBox(height: 8),
            _TrackTile(
              label: lang.t('subtitles_disabled'),
              icon: Icons.subtitles_off_rounded,
              selected: _selSubtitle == SubtitleTrack.no(),
              onTap: () => _pickSubtitle(SubtitleTrack.no()),
            ),
            ...subtitleTracks
              .where((t) => t != SubtitleTrack.auto() && t != SubtitleTrack.no())
              .map((t) => _TrackTile(
                label: _subtitleLabel(t),
                selected: _selSubtitle == t,
                onTap: () => _pickSubtitle(t),
              )),
            const SizedBox(height: 20),
          ],

          // ── Subtitle appearance ───────────────────────────────────────────
          _SectionHeader(icon: Icons.text_fields_rounded, label: lang.t('subtitle_appearance')),
          const SizedBox(height: 14),

          _SettingRow(
            label: lang.t('color'),
            chips: [
              _Chip(
                label: lang.t('white'),
                selected: _settings.color == SubtitleColor.white,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.white)),
              ),
              _Chip(
                label: lang.t('yellow'),
                dotColor: const Color(0xFFFFE000),
                selected: _settings.color == SubtitleColor.yellow,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.yellow)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          _SettingRow(
            label: lang.t('background'),
            chips: [
              _Chip(
                label: lang.t('none'),
                selected: _settings.background == SubtitleBackground.none,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.none)),
              ),
              _Chip(
                label: lang.t('dark'),
                selected: _settings.background == SubtitleBackground.dark,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.dark)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          _SettingRow(
            label: lang.t('size'),
            chips: [
              _Chip(
                label: lang.t('small'),
                selected: _settings.size == SubtitleSize.small,
                onTap: () => _update(_settings.copyWith(size: SubtitleSize.small)),
              ),
              _Chip(
                label: lang.t('medium'),
                selected: _settings.size == SubtitleSize.medium,
                onTap: () => _update(_settings.copyWith(size: SubtitleSize.medium)),
              ),
              _Chip(
                label: lang.t('large'),
                selected: _settings.size == SubtitleSize.large,
                onTap: () => _update(_settings.copyWith(size: SubtitleSize.large)),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Preview
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 12),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0x229D4EDD)),
            ),
            child: Center(
              child: Text(
                lang.t('subtitle_preview'),
                style: _settings.textStyle.copyWith(
                  fontSize: (_settings.fontSize * 0.33).clamp(13.0, 22.0),
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

// ─── Shared widgets ───────────────────────────────────────────────────────────
class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionHeader({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) => Row(children: [
    Icon(icon, color: const Color(0xFF9D4EDD), size: 18),
    const SizedBox(width: 8),
    Text(label, style: const TextStyle(
      color: Color(0xFFBB86FC), fontSize: 14,
      fontWeight: FontWeight.w700, letterSpacing: 0.5,
    )),
  ]);
}

class _TrackTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  const _TrackTile({required this.label, required this.selected, required this.onTap, this.icon});

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(8),
    child: Container(
      margin: const EdgeInsets.symmetric(vertical: 3),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: selected ? const Color(0x339D4EDD) : Colors.white.withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: selected ? const Color(0xFF9D4EDD) : Colors.transparent),
      ),
      child: Row(children: [
        if (icon != null) ...[
          Icon(icon, size: 16, color: selected ? const Color(0xFFBB86FC) : const Color(0xFFB0AEC8)),
          const SizedBox(width: 10),
        ],
        Expanded(
          child: Text(label, style: TextStyle(
            color: selected ? Colors.white : const Color(0xFFB0AEC8),
            fontSize: 14,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          )),
        ),
        if (selected)
          const Icon(Icons.check_rounded, color: Color(0xFF9D4EDD), size: 18),
      ]),
    ),
  );
}

class _SettingRow extends StatelessWidget {
  final String label;
  final List<Widget> chips;
  const _SettingRow({required this.label, required this.chips});

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      SizedBox(
        width: 68,
        child: Text(label, style: const TextStyle(color: Color(0xFFB0AEC8), fontSize: 12)),
      ),
      Expanded(child: Wrap(spacing: 8, runSpacing: 6, children: chips)),
    ],
  );
}

class _Chip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final Color? dotColor;

  const _Chip({required this.label, required this.selected, required this.onTap, this.dotColor});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: selected ? const Color(0x339D4EDD) : Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: selected ? const Color(0xFF9D4EDD) : Colors.white.withValues(alpha: 0.08),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (dotColor != null) ...[
            Container(
              width: 9, height: 9,
              margin: const EdgeInsets.only(right: 5),
              decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle),
            ),
          ],
          Text(label, style: TextStyle(
            color: selected ? Colors.white : const Color(0xFFB0AEC8),
            fontSize: 12,
            fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
          )),
        ],
      ),
    ),
  );
}
