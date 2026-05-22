import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../screens/remote_control_screen.dart';

class CastMiniPlayer extends StatelessWidget {
  const CastMiniPlayer({super.key});

  @override
  Widget build(BuildContext context) {
    if (!Platform.isAndroid && !Platform.isIOS) return const SizedBox.shrink();

    return StreamBuilder<GoogleCastSession?>(
      stream: GoogleCastSessionManager.instance.currentSessionStream,
      builder: (context, snapshot) {
        final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
        if (!isConnected) return const SizedBox.shrink();

        return StreamBuilder<GoggleCastMediaStatus?>(
          stream: GoogleCastRemoteMediaClient.instance.mediaStatusStream,
          builder: (context, mediaSnap) {
            final status = mediaSnap.data ?? GoogleCastRemoteMediaClient.instance.mediaStatus;
            if (status == null || status.playerState == CastMediaPlayerState.idle) return const SizedBox.shrink();

            final metadata = status.mediaInformation?.metadata;
            String? title;
            String? subtitle;
            if (metadata is GoogleCastMovieMediaMetadata) {
              title = metadata.title;
              subtitle = metadata.subtitle;
            }

            final displayTitle = title ?? 'En cours de lecture';

            return Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => RemoteControlScreen(
                  title: displayTitle,
                  subtitle: subtitle,
                  image: metadata?.images?.isNotEmpty == true ? metadata!.images!.first.url.toString() : null,
                ))),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: const BoxDecoration(
                    color: Color(0xFF1A0F2E),
                    border: Border(top: BorderSide(color: Color(0xFF9D4EDD), width: 1)),
                  ),
                  child: SafeArea(
                    top: false,
                    bottom: true,
                    child: Row(
                      children: [
                        const Icon(Icons.cast_connected, color: Color(0xFF9D4EDD), size: 20),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Text(
                                'Casting : $displayTitle',
                                style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              Text(
                                'Appuyez pour contrôler',
                                style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: Icon(
                            status.playerState == CastMediaPlayerState.playing ? Icons.pause_rounded : Icons.play_arrow_rounded,
                            color: Colors.white,
                          ),
                          onPressed: () {
                            if (status.playerState == CastMediaPlayerState.playing) {
                              GoogleCastRemoteMediaClient.instance.pause();
                            } else {
                              GoogleCastRemoteMediaClient.instance.play();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }
}
