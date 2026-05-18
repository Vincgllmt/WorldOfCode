import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CacheService {
  static const String _prefix = 'persistent_cache_';
  static const String _timestampPrefix = 'cache_time_';

  // Cache duration: 24 hours
  static const Duration _cacheDuration = Duration(hours: 24);

  static Future<void> save(String key, dynamic data) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('$_prefix$key', json.encode(data));
    await prefs.setInt('$_timestampPrefix$key', DateTime.now().millisecondsSinceEpoch);
  }

  static Future<dynamic> get(String key) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString('$_prefix$key');
    final timestamp = prefs.getInt('$_timestampPrefix$key');

    if (jsonStr == null || timestamp == null) return null;

    final savedTime = DateTime.fromMillisecondsSinceEpoch(timestamp);
    if (DateTime.now().difference(savedTime) > _cacheDuration) {
      // Cache expired
      return null;
    }

    return json.decode(jsonStr);
  }

  static Future<void> clear() async {
    final prefs = await SharedPreferences.getInstance();
    final keys = prefs.getKeys().where((k) => k.startsWith(_prefix) || k.startsWith(_timestampPrefix));
    for (final key in keys) {
      await prefs.remove(key);
    }
  }
}
