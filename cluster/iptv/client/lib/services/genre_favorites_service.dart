import 'package:shared_preferences/shared_preferences.dart';

class GenreFavoritesService {
  static Future<Set<String>> load(String key) async {
    final prefs = await SharedPreferences.getInstance();
    return Set<String>.from(prefs.getStringList('woc_fav_genres_$key') ?? []);
  }

  static Future<void> save(String key, Set<String> favs) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('woc_fav_genres_$key', favs.toList());
  }
}
