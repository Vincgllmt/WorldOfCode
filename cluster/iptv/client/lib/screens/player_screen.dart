import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';
import '../services/subtitle_settings.dart';

class PlayerScreen extends StatefulWidget {
  final String name;
  final String url;
  final String? group;

  const PlayerScreen({super.key, required this.name, required this.url, this.group});

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late final Player _player = Player();
  late final VideoController _ctrl = VideoController(_player);

  Tracks _tracks = const Tracks();
  Track  _track  = const Track();
  SubtitleSettings _subSettings = const SubtitleSettings();

  @override
  void initState() {
    super.initState();
    _player.open(_buildMedia(widget.url));
    _player.stream.tracks.listen((t) { if (mounted) setState(() => _tracks = t); });
    _player.stream.track.listen((t)  { if (mounted) setState(() => _track  = t); });
    SubtitleSettings.load().then((s) { if (mounted) setState(() => _subSettings = s); });
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
        onAudio:       (t) { _player.setAudioTrack(t);    Navigator.pop(context); },
        onSubtitle:    (t) { _player.setSubtitleTrack(t); Navigator.pop(context); },
        onSubSettings: (s) => setState(() => _subSettings = s),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Row(
          children: [
            const Icon(Icons.circle, size: 8, color: Color(0xFFFF4757)),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                widget.name,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
        actions: [
          if (widget.group != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0x449D4EDD),
                  borderRadius: BorderRadius.circular(5),
                  border: Border.all(color: const Color(0x779D4EDD)),
                ),
                child: Text(
                  widget.group!,
                  style: const TextStyle(color: Color(0xFFBB86FC), fontSize: 12),
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Audio / Sous-titres',
            onPressed: _showTrackSelector,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: Video(
        controller: _ctrl,
        controls: AdaptiveVideoControls,
        subtitleViewConfiguration: _subConfig,
      ),
    );
  }
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

  @override
  void initState() {
    super.initState();
    _settings = widget.subSettings;
  }

  void _update(SubtitleSettings s) {
    setState(() => _settings = s);
    widget.onSubSettings(s);
    s.save();
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
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          // ── Audio ─────────────────────────────────────────────────────────
          if (audioTracks.length > 1) ...[
            const _SectionHeader(icon: Icons.volume_up_rounded, label: 'Langue audio'),
            const SizedBox(height: 8),
            ...audioTracks.map((t) => _TrackTile(
              label: _audioLabel(t),
              selected: widget.current.audio == t,
              onTap: () => widget.onAudio(t),
            )),
            const SizedBox(height: 20),
          ],

          // ── Subtitle track ────────────────────────────────────────────────
          if (subtitleTracks.length > 1) ...[
            const _SectionHeader(icon: Icons.subtitles_rounded, label: 'Sous-titres'),
            const SizedBox(height: 8),
            _TrackTile(
              label: 'Désactivés',
              icon: Icons.subtitles_off_rounded,
              selected: widget.current.subtitle == SubtitleTrack.no(),
              onTap: () => widget.onSubtitle(SubtitleTrack.no()),
            ),
            ...subtitleTracks
              .where((t) => t != SubtitleTrack.auto() && t != SubtitleTrack.no())
              .map((t) => _TrackTile(
                label: _subtitleLabel(t),
                selected: widget.current.subtitle == t,
                onTap: () => widget.onSubtitle(t),
              )),
            const SizedBox(height: 20),
          ],

          // ── Subtitle appearance ───────────────────────────────────────────
          const _SectionHeader(icon: Icons.text_fields_rounded, label: 'Apparence sous-titres'),
          const SizedBox(height: 14),

          _SettingRow(
            label: 'Couleur',
            chips: [
              _Chip(
                label: 'Blanc',
                selected: _settings.color == SubtitleColor.white,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.white)),
              ),
              _Chip(
                label: 'Jaune',
                dotColor: const Color(0xFFFFE000),
                selected: _settings.color == SubtitleColor.yellow,
                onTap: () => _update(_settings.copyWith(color: SubtitleColor.yellow)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          _SettingRow(
            label: 'Fond',
            chips: [
              _Chip(
                label: 'Aucun',
                selected: _settings.background == SubtitleBackground.none,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.none)),
              ),
              _Chip(
                label: 'Sombre',
                selected: _settings.background == SubtitleBackground.dark,
                onTap: () => _update(_settings.copyWith(background: SubtitleBackground.dark)),
              ),
            ],
          ),
          const SizedBox(height: 10),

          _SettingRow(
            label: 'Taille',
            chips: [
              _Chip(
                label: 'Petit',
                selected: _settings.size == SubtitleSize.small,
                onTap: () => _update(_settings.copyWith(size: SubtitleSize.small)),
              ),
              _Chip(
                label: 'Normal',
                selected: _settings.size == SubtitleSize.medium,
                onTap: () => _update(_settings.copyWith(size: SubtitleSize.medium)),
              ),
              _Chip(
                label: 'Grand',
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
                'Aperçu des sous-titres',
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
    if (t == AudioTrack.auto()) return 'Auto';
    if (t == AudioTrack.no())   return 'Muet';
    final lang  = t.language?.toUpperCase();
    final title = t.title;
    if (lang != null && title != null) return '$lang — $title';
    return lang ?? title ?? 'Piste ${t.id}';
  }

  String _subtitleLabel(SubtitleTrack t) {
    final lang  = t.language?.toUpperCase();
    final title = t.title;
    if (lang != null && title != null) return '$lang — $title';
    return lang ?? title ?? 'Piste ${t.id}';
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
