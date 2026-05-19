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

                  // EPG Info Overlay (Bottom Left)
                  if (widget.type == 'live' && _epg != null && _epg!.isNotEmpty)
                    Positioned(
                      bottom: 80,
                      left: 24,
                      child: IgnorePointer(
                        ignoring: !_showOverlay,
                        child: AnimatedOpacity(
                          opacity: _showOverlay ? 1.0 : 0.0,
                          duration: const Duration(milliseconds: 300),
                          child: _EpgOverlay(epg: _epg!),
                        ),
                      ),
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
                  IgnorePointer(
                    ignoring: !_showOverlay,
                    child: AnimatedOpacity(
                      opacity: _showOverlay ? 1.0 : 0.0,
                      duration: const Duration(milliseconds: 300),
                      child: StreamBuilder<bool>(
                        stream: _player.stream.playing,
                        builder: (context, snapshot) {
                          final isPlaying = snapshot.data ?? false;
                          return GestureDetector(
                            onTap: () {
                              _player.playOrPause();
                              _resetOverlayTimer();
                            },
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
                    ),
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
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
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
            backgroundColor: Colors.white.withValues(alpha: 0.1),
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
          padding: const EdgeInsets.symmetric(horizontal: 6.0),
          child: TextButton(
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              backgroundColor: isSelected ? const Color(0xFF9D4EDD) : const Color(0xFFBB86FC).withValues(alpha: 0.15),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: BorderSide(color: isSelected ? Colors.transparent : const Color(0x44BB86FC), width: 1.5),
              ),
              minimumSize: const Size(80, 48),
            ),
            onPressed: e.value,
            child: Text(
              e.key, 
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFFBB86FC), 
                fontSize: 16, 
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
