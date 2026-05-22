import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';
import '../services/language_service.dart';

class RemoteControlScreen extends StatelessWidget {
  final String title;
  final String? subtitle;
  final String? image;

  const RemoteControlScreen({
    super.key,
    required this.title,
    this.subtitle,
    this.image,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0C0714),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white, size: 32),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          StreamBuilder<GoogleCastSession?>(
            stream: GoogleCastSessionManager.instance.currentSessionStream,
            builder: (context, snapshot) {
              final isConnected = GoogleCastSessionManager.instance.connectionState == GoogleCastConnectState.connected;
              if (!isConnected) {
                WidgetsBinding.instance.addPostFrameCallback((_) {
                  if (Navigator.canPop(context)) Navigator.pop(context);
                });
              }
              return IconButton(
                icon: const Icon(Icons.cast_connected, color: Color(0xFF9D4EDD)),
                onPressed: () => GoogleCastSessionManager.instance.endSessionAndStopCasting(),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: StreamBuilder<GoggleCastMediaStatus?>(
        stream: GoogleCastRemoteMediaClient.instance.mediaStatusStream,
        builder: (context, snapshot) {
          final status = snapshot.data ?? GoogleCastRemoteMediaClient.instance.mediaStatus;
          final playerState = status?.playerState ?? CastMediaPlayerState.unknown;
          final isPlaying = playerState == CastMediaPlayerState.playing;
          final isBuffering = playerState == CastMediaPlayerState.buffering || playerState == CastMediaPlayerState.loading;
          
          return SingleChildScrollView(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const SizedBox(height: 20),
                // Poster
                Center(
                  child: Container(
                    width: MediaQuery.of(context).size.width * 0.6,
                    height: MediaQuery.of(context).size.width * 0.85,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF9D4EDD).withOpacity(0.2),
                          blurRadius: 30,
                          spreadRadius: 5,
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: image != null
                        ? CachedNetworkImage(
                            imageUrl: image!,
                            fit: BoxFit.cover,
                            placeholder: (_, __) => _fallback(),
                            errorWidget: (_, __, ___) => _fallback(),
                          )
                        : _fallback(),
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                
                // Metadata
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Column(
                    children: [
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      if (subtitle != null) ...[
                        const SizedBox(height: 6),
                        Text(
                          subtitle!,
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 10),
                
                // Device name
                StreamBuilder<GoogleCastSession?>(
                  stream: GoogleCastSessionManager.instance.currentSessionStream,
                  builder: (context, snap) {
                    final name = snap.data?.device?.friendlyName ?? 'Appareil Cast';
                    return Text(
                      'Sur $name',
                      style: const TextStyle(color: Color(0xFF9D4EDD), fontSize: 13, fontWeight: FontWeight.w500),
                    );
                  },
                ),
                
                const SizedBox(height: 30),
                
                // Progress slider
                if (status?.mediaInformation?.duration != null && status!.mediaInformation!.duration!.inSeconds > 0)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: StreamBuilder<Duration>(
                      stream: GoogleCastRemoteMediaClient.instance.playerPositionStream,
                      builder: (context, snap) {
                        final pos = snap.data ?? Duration.zero;
                        final dur = status.mediaInformation!.duration!;
                        return Column(
                          children: [
                            SliderTheme(
                              data: SliderTheme.of(context).copyWith(
                                activeTrackColor: const Color(0xFF9D4EDD),
                                inactiveTrackColor: Colors.white.withOpacity(0.1),
                                thumbColor: Colors.white,
                                trackHeight: 4,
                                thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 6),
                              ),
                              child: Slider(
                                value: pos.inSeconds.toDouble().clamp(0, dur.inSeconds.toDouble()),
                                max: dur.inSeconds.toDouble(),
                                onChanged: (v) {
                                  GoogleCastRemoteMediaClient.instance.seek(
                                    GoogleCastMediaSeekOption(
                                      position: Duration(seconds: v.toInt()),
                                      resumeState: GoogleCastMediaResumeState.play,
                                    ),
                                  );
                                },
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(_formatDuration(pos), style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11)),
                                  Text(_formatDuration(dur), style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11)),
                                ],
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),

                const SizedBox(height: 20),
                
                // Controls
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    _ControlButton(
                      icon: Icons.replay_10_rounded,
                      onTap: () {
                        // Relative seek if supported, otherwise absolute
                        GoogleCastRemoteMediaClient.instance.seek(
                          GoogleCastMediaSeekOption(
                            position: const Duration(seconds: -10), 
                            relative: true,
                            resumeState: GoogleCastMediaResumeState.play,
                          ),
                        );
                      },
                    ),
                    const SizedBox(width: 25),
                    Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () {
                          if (isPlaying || isBuffering) {
                            GoogleCastRemoteMediaClient.instance.pause();
                          } else {
                            GoogleCastRemoteMediaClient.instance.play();
                          }
                        },
                        customBorder: const CircleBorder(),
                        child: Container(
                          width: 70,
                          height: 70,
                          decoration: const BoxDecoration(
                            color: Color(0xFF9D4EDD),
                            shape: BoxShape.circle,
                          ),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              if (isBuffering)
                                const SizedBox(
                                  width: 50,
                                  height: 50,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                                ),
                              Icon(
                                isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                                color: Colors.white,
                                size: 40,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 25),
                    _ControlButton(
                      icon: Icons.forward_10_rounded,
                      onTap: () {
                        GoogleCastRemoteMediaClient.instance.seek(
                          GoogleCastMediaSeekOption(
                            position: const Duration(seconds: 10), 
                            relative: true,
                            resumeState: GoogleCastMediaResumeState.play,
                          ),
                        );
                      },
                    ),
                  ],
                ),
                
                const SizedBox(height: 60),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _fallback() => Container(
    color: const Color(0xFF1A0F2E),
    child: const Center(child: Icon(Icons.movie_rounded, size: 60, color: Color(0x449D4EDD))),
  );

  String _formatDuration(Duration d) {
    final h = d.inHours;
    final m = d.inMinutes.remainder(60);
    final s = d.inSeconds.remainder(60);
    if (h > 0) return '$h:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
    return '$m:${s.toString().padLeft(2, '0')}';
  }
}

class _ControlButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  final double size;
  final double iconSize;
  const _ControlButton({required this.icon, required this.onTap, this.size = 54, this.iconSize = 28});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(size / 2),
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: iconSize),
      ),
    );
  }
}
