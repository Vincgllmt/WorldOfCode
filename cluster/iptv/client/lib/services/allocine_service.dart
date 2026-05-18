import 'package:http/http.dart' as http;
import 'cache_service.dart';

class AllocineService {
  static final AllocineService _instance = AllocineService._internal();
  factory AllocineService() => _instance;
  AllocineService._internal();

  static const String _baseUrl = 'https://www.allocine.fr/recherche/?q=';

  Future<String?> getRating(String title) async {
    final cacheKey = 'allocine_rating_${title.toLowerCase().replaceAll(RegExp(r'\s+'), '_')}';
    
    // Check cache first
    final cached = await CacheService.get(cacheKey);
    if (cached != null) return cached as String;

    try {
      final response = await http.get(
        Uri.parse('$_baseUrl${Uri.encodeComponent(title)}'),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        },
      ).timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final html = response.body;
        
        // Very basic extraction of the first rating found in the search results
        // Usually looks like: <span class="starrating-value">4,2</span>
        final ratingMatch = RegExp(r'starrating-value">([0-9],[0-9])</span>').firstMatch(html);
        if (ratingMatch != null) {
          final rating = ratingMatch.group(1)?.replaceAll(',', '.');
          if (rating != null) {
            await CacheService.save(cacheKey, rating);
            return rating;
          }
        }
      }
    } catch (e) {
      // Silent error, we just don't show the rating
    }

    return null;
  }
}

final allocine = AllocineService();
