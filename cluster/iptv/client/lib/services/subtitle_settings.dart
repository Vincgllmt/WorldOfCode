import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum SubtitleColor { white, yellow }
enum SubtitleBackground { none, dark }
enum SubtitleSize { small, medium, large }

class SubtitleSettings {
  final SubtitleColor color;
  final SubtitleBackground background;
  final SubtitleSize size;

  const SubtitleSettings({
    this.color = SubtitleColor.white,
    this.background = SubtitleBackground.dark,
    this.size = SubtitleSize.medium,
  });

  double get fontSize => switch (size) {
    SubtitleSize.small  => 32.0,
    SubtitleSize.medium => 48.0,
    SubtitleSize.large  => 64.0,
  };

  Color get textColor => switch (color) {
    SubtitleColor.white  => Colors.white,
    SubtitleColor.yellow => const Color(0xFFFFE000),
  };

  Color? get bgColor => switch (background) {
    SubtitleBackground.none => null,
    SubtitleBackground.dark => const Color(0xAA000000),
  };

  TextStyle get textStyle => TextStyle(
    color: textColor,
    fontSize: fontSize,
    backgroundColor: bgColor,
    fontWeight: FontWeight.w600,
    shadows: background == SubtitleBackground.none
        ? const [Shadow(color: Colors.black, blurRadius: 6, offset: Offset(1, 1))]
        : null,
  );

  SubtitleSettings copyWith({
    SubtitleColor? color,
    SubtitleBackground? background,
    SubtitleSize? size,
  }) => SubtitleSettings(
    color:      color      ?? this.color,
    background: background ?? this.background,
    size:       size       ?? this.size,
  );

  Future<void> save() async {
    final p = await SharedPreferences.getInstance();
    await Future.wait([
      p.setInt('sub_color', color.index),
      p.setInt('sub_bg', background.index),
      p.setInt('sub_size', size.index),
    ]);
  }

  static Future<SubtitleSettings> load() async {
    final p = await SharedPreferences.getInstance();
    return SubtitleSettings(
      color:      SubtitleColor.values[p.getInt('sub_color') ?? 0],
      background: SubtitleBackground.values[p.getInt('sub_bg') ?? 1],
      size:       SubtitleSize.values[p.getInt('sub_size') ?? 1],
    );
  }
}
