import 'package:flutter/material.dart';
import 'package:media_kit/media_kit.dart';
import 'package:media_kit_video/media_kit_video.dart';

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
  Track _track = const Track();

  @override
  void initState() {
    super.initState();
    _player.open(_buildMedia(widget.url));
    _player.stream.tracks.listen((t) { if (mounted) setState(() => _tracks = t); });
    _player.stream.track.listen((t)  { if (mounted) setState(() => _track  = t); });
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

  void _showTrackSelector() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1A0F2E),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => _TrackSheet(
        tracks: _tracks,
        current: _track,
        onAudio:    (t) { _player.setAudioTrack(t);    Navigator.pop(context); },
        onSubtitle: (t) { _player.setSubtitleTrack(t); Navigator.pop(context); },
      ),
    );
  }

  bool get _hasAudioChoice    => _tracks.audio.length    > 1;
  bool get _hasSubtitleChoice => _tracks.subtitle.length > 1;

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
          // Track selector — only shown when there are choices
          if (_hasAudioChoice || _hasSubtitleChoice)
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
      ),
    );
  }
}

// ─── Track selector bottom sheet ──────────────────────────────────────────────
class _TrackSheet extends StatelessWidget {
  final Tracks tracks;
  final Track current;
  final void Function(AudioTrack) onAudio;
  final void Function(SubtitleTrack) onSubtitle;

  const _TrackSheet({
    required this.tracks,
    required this.current,
    required this.onAudio,
    required this.onSubtitle,
  });

  static const _txtSub  = Color(0xFFB0AEC8);

  @override
  Widget build(BuildContext context) {
    final audioTracks    = tracks.audio;
    final subtitleTracks = tracks.subtitle;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle bar
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

          // ── Audio ────────────────────────────────────────────────────────
          if (audioTracks.length > 1) ...[
            _SectionHeader(icon: Icons.volume_up_rounded, label: 'Langue audio'),
            const SizedBox(height: 8),
            ...audioTracks.map((t) => _TrackTile(
              label: _audioLabel(t),
              selected: current.audio == t,
              onTap: () => onAudio(t),
            )),
            const SizedBox(height: 20),
          ],

          // ── Subtitles ─────────────────────────────────────────────────────
          if (subtitleTracks.length > 1) ...[
            _SectionHeader(icon: Icons.subtitles_rounded, label: 'Sous-titres'),
            const SizedBox(height: 8),
            // "Off" option
            _TrackTile(
              label: 'Désactivés',
              icon: Icons.subtitles_off_rounded,
              selected: current.subtitle == SubtitleTrack.no(),
              onTap: () => onSubtitle(SubtitleTrack.no()),
            ),
            ...subtitleTracks
              .where((t) => t != SubtitleTrack.auto() && t != SubtitleTrack.no())
              .map((t) => _TrackTile(
                label: _subtitleLabel(t),
                selected: current.subtitle == t,
                onTap: () => onSubtitle(t),
              )),
          ],

          if (audioTracks.length <= 1 && subtitleTracks.length <= 1)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Center(
                child: Text(
                  'Aucune piste alternative disponible pour ce flux.',
                  style: TextStyle(color: _txtSub, fontSize: 13),
                  textAlign: TextAlign.center,
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

class _SectionHeader extends StatelessWidget {
  final IconData icon;
  final String label;
  const _SectionHeader({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      Icon(icon, color: const Color(0xFF9D4EDD), size: 18),
      const SizedBox(width: 8),
      Text(label, style: const TextStyle(
        color: Color(0xFFBB86FC), fontSize: 14, fontWeight: FontWeight.w700, letterSpacing: 0.5,
      )),
    ]);
  }
}

class _TrackTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  const _TrackTile({required this.label, required this.selected, required this.onTap, this.icon});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 3),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? const Color(0x339D4EDD) : Colors.white.withValues(alpha: 0.04),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: selected ? const Color(0xFF9D4EDD) : Colors.transparent,
            width: 1,
          ),
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
}
