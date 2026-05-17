import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum ViewMode { themes, gridSmall, gridMedium, gridLarge }

class SettingsService {
  static final SettingsService _instance = SettingsService._internal();
  factory SettingsService() => _instance;
  SettingsService._internal();

  final ValueNotifier<ViewMode> viewMode = ValueNotifier(ViewMode.gridMedium);

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final modeStr = prefs.getString('viewMode') ?? 'gridMedium';
    viewMode.value = ViewMode.values.firstWhere(
      (e) => e.name == modeStr,
      orElse: () => ViewMode.gridMedium,
    );
  }

  void setViewMode(ViewMode mode) async {
    viewMode.value = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('viewMode', mode.name);
  }
}

final settings = SettingsService();
