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

  @override
  void initState() {
    super.initState();
    _player.open(_buildMedia(widget.url));
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
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
        ],
      ),
      body: Video(
        controller: _ctrl,
        controls: AdaptiveVideoControls,
      ),
    );
  }
}
