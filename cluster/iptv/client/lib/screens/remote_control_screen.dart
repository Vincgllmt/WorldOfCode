import 'dart:io';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_chrome_cast/flutter_chrome_cast.dart';

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
                // If disconnected while on this screen, close it
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
          
          return Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Poster
              Center(
                child: Container(
                  width: MediaQuery.of(context).size.width * 0.7,
                  height: MediaQuery.of(context).size.width * 1.0,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF9D4EDD).withOpacity(0.3),
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
              const SizedBox(height: 40),
              
              // Metadata
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 40),
                child: Column(
                  children: [
                    Text(
                      title,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        subtitle!,
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 16),
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
                    style: const TextStyle(color: Color(0xFF9D4EDD), fontSize: 14, fontWeight: FontWeight.w500),
                  );
                },
              ),
              
              const SizedBox(height: 40),
              
              // Controls
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _ControlButton(
                    icon: Icons.replay_10_rounded,
                    onTap: () => GoogleCastRemoteMediaClient.instance.seek(
                      GoogleCastMediaSeekOption(
                        position: const Duration(seconds: -10), 
                        relative: true,
                        resumeState: GoogleCastMediaResumeState.play,
                      ),
                    ),
                  ),
                  const SizedBox(width: 30),
                  GestureDetector(
                    onTap: () {
                      if (isPlaying || isBuffering) {
                        GoogleCastRemoteMediaClient.instance.pause();
                      } else {
                        GoogleCastRemoteMediaClient.instance.play();
                      }
                    },
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: const BoxDecoration(
                        color: Color(0xFF9D4EDD),
                        shape: BoxShape.circle,
                      ),
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          if (isBuffering)
                            const SizedBox(
                              width: 60,
                              height: 60,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3),
                            ),
                          Icon(
                            isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                            color: Colors.white,
                            size: 48,
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 30),
                  _ControlButton(
                    icon: Icons.forward_10_rounded,
                    onTap: () => GoogleCastRemoteMediaClient.instance.seek(
                      GoogleCastMediaSeekOption(
                        position: const Duration(seconds: 10), 
                        relative: true,
                        resumeState: GoogleCastMediaResumeState.play,
                      ),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 40),
              
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
                                Text(_formatDuration(pos), style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                                Text(_formatDuration(dur), style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                              ],
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  Widget _fallback() => Container(
    color: const Color(0xFF1A0F2E),
    child: const Center(child: Icon(Icons.movie_rounded, size: 80, color: Color(0x449D4EDD))),
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
  const _ControlButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(30),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.white.withOpacity(0.1)),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: Colors.white, size: 28),
      ),
    );
  }
}
