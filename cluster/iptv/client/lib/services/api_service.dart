import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/channel.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import 'credentials_service.dart';

class ApiService {
  static const String _base = 'https://iptv-api.duckdns.org/api/v1';

  // In-memory cache so we don't hit secure storage on every request.
  static Credentials? _creds;

  static void invalidateCache() => _creds = null;

  Future<Map<String, String>> _headers() async {
    _creds ??= await CredentialsService.load();
    final c = _creds;
    if (c == null) throw Exception('Aucun compte configuré');
    return {
      'X-Xtream-Host': c.host,
      'X-Xtream-User': c.user,
      'X-Xtream-Pass': c.pass,
    };
  }

  Future<bool> validate(Credentials creds) async {
    final res = await http.get(
      Uri.parse('$_base/validate'),
      headers: {
        'X-Xtream-Host': creds.host,
        'X-Xtream-User': creds.user,
        'X-Xtream-Pass': creds.pass,
      },
    );
    return res.statusCode == 200;
  }

  Future<List<Channel>> fetchChannels() async {
    final res = await http.get(Uri.parse('$_base/channels'), headers: await _headers());
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => Channel.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<List<Movie>> fetchMovies() async {
    final res = await http.get(Uri.parse('$_base/movies'), headers: await _headers());
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => Movie.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<MovieDetail> fetchMovieDetail(int id) async {
    final res = await http.get(Uri.parse('$_base/movies/$id'), headers: await _headers());
    if (res.statusCode == 200) {
      return MovieDetail.fromJson(json.decode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<List<SeriesItem>> fetchSeries() async {
    final res = await http.get(Uri.parse('$_base/series'), headers: await _headers());
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => SeriesItem.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<SeriesDetail> fetchSeriesDetail(int seriesId) async {
    final res = await http.get(Uri.parse('$_base/series/$seriesId'), headers: await _headers());
    if (res.statusCode == 200) {
      return SeriesDetail.fromJson(json.decode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }
}
