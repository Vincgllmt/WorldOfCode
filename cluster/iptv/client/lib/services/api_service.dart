import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/channel.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';

class ApiService {
  static const String _base = 'http://iptv-api.duckdns.org/api/v1';

  Future<List<Channel>> fetchChannels() async {
    final res = await http.get(Uri.parse('$_base/channels'));
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => Channel.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<List<Movie>> fetchMovies() async {
    final res = await http.get(Uri.parse('$_base/movies'));
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => Movie.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<MovieDetail> fetchMovieDetail(int id) async {
    final res = await http.get(Uri.parse('$_base/movies/$id'));
    if (res.statusCode == 200) {
      return MovieDetail.fromJson(json.decode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<List<SeriesItem>> fetchSeries() async {
    final res = await http.get(Uri.parse('$_base/series'));
    if (res.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(res.bodyBytes));
      return data.map((j) => SeriesItem.fromJson(j as Map<String, dynamic>)).toList();
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }

  Future<SeriesDetail> fetchSeriesDetail(int seriesId) async {
    final res = await http.get(Uri.parse('$_base/series/$seriesId'));
    if (res.statusCode == 200) {
      return SeriesDetail.fromJson(json.decode(utf8.decode(res.bodyBytes)) as Map<String, dynamic>);
    }
    throw Exception('Erreur serveur: ${res.statusCode}');
  }
}
