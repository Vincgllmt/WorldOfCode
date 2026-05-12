import 'package:shared_preferences/shared_preferences.dart';

class FavoritesService {
  static const _key = 'woc_tv_favorites';

  static Future<Set<String>> loadFavorites() async {
    final prefs = await SharedPreferences.getInstance();
    return Set<String>.from(prefs.getStringList(_key) ?? []);
  }

  static Future<void> saveFavorites(Set<String> favorites) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList(_key, favorites.toList());
  }
}
