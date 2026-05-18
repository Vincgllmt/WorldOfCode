import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import '../models/channel.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import 'credentials_service.dart';
import 'cache_service.dart';

class ApiService {
  // In-memory cache so we don't hit secure storage on every request.
  static Credentials? _creds;

  // In-memory data cache
  static List<Channel>? _channelsCache;
  static List<Movie>? _moviesCache;
  static List<SeriesItem>? _seriesCache;

  // Custom HTTP client that ignores SSL certificate errors (common on IPTV servers)
  late final http.Client _client;

  ApiService() {
    final ioClient = HttpClient()
      ..badCertificateCallback = ((X509Certificate cert, String host, int port) => true);
    _client = IOClient(ioClient);
  }

  static void invalidateCache() {
    _creds = null;
    _channelsCache = null;
    _moviesCache = null;
    _seriesCache = null;
    CacheService.clear();
  }

  Future<Credentials> _getCreds() async {
    _creds ??= await CredentialsService.load();
    if (_creds == null) throw Exception('Aucun compte configuré');
    return _creds!;
  }

  String _buildUrl(Credentials c, {String? action, String? other}) {
    var url = '${c.host}/player_api.php?username=${c.user}&password=${c.pass}';
    if (action != null) url += '&action=$action';
    if (other != null) url += other;
    return url;
  }

  // ─── Cleaning Logic (Translated from Python) ───────────────────────────────

  static final RegExp _displayTags = RegExp(r'\s*[\(\[][^\)\]]*[\)\]]|\s*[-|│‖]{1,3}\s*\w*\s*[-|│‖]{1,3}');
  static final RegExp _specialChars = RegExp(r'[★☆✪✦◈❤♛♕❖◆▶►•·]+');
  static final RegExp _multiSpaces = RegExp(r'\s{2,}');
  static final RegExp _catFilter = RegExp(r'[^\w\s\-/éèêëàâùûüîïôœç]', unicode: true);

  String _cleanName(String name) {
    String cleaned = name.replaceAll(_displayTags, '').trim();
    cleaned = cleaned.replaceAll(_specialChars, '').trim();
    cleaned = cleaned.replaceAll(_multiSpaces, ' ');
    return cleaned.isEmpty ? name.trim() : cleaned;
  }

  String _cleanCat(String name) {
    String cleaned = name.replaceAll(_catFilter, '').trim();
    cleaned = cleaned.replaceAll(_multiSpaces, ' ');
    return cleaned.isEmpty ? "Autres" : cleaned;
  }

  // ─── Endpoints ─────────────────────────────────────────────────────────────

  Future<bool> validate(Credentials creds) async {
    try {
      final url = _buildUrl(creds);
      final res = await _client.get(Uri.parse(url)).timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return false;
      final data = json.decode(res.body);
      return data['user_info']['auth'] == 1;
    } catch (e) {
      return false;
    }
  }

  Future<List<Channel>> fetchChannels({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      if (_channelsCache != null) return _channelsCache!;
      final cached = await CacheService.get('channels');
      if (cached != null) {
        _channelsCache = (cached as List).map((e) => Channel.fromJson(e)).toList();
        return _channelsCache!;
      }
    }

    final c = await _getCreds();
    
    // Fetch categories and streams in parallel
    final results = await Future.wait([
      _client.get(Uri.parse(_buildUrl(c, action: 'get_live_categories'))),
      _client.get(Uri.parse(_buildUrl(c, action: 'get_live_streams'))),
    ]);

    if (results[0].statusCode != 200 || results[1].statusCode != 200) {
      throw Exception('Erreur lors du chargement des chaînes');
    }

    final List catsData = json.decode(results[0].body);
    final List streamsData = json.decode(results[1].body);

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    final List<Map<String, dynamic>> rawData = [];
    _channelsCache = streamsData.map((s) {
      final catId = s['category_id'].toString();
      final channel = Channel(
        name: _cleanName(s['name']),
        url: '${c.host}/live/${c.user}/${c.pass}/${s['stream_id']}.ts',
        logo: s['stream_icon'],
        group: catMap[catId] ?? "Autres",
      );
      rawData.add(channel.toJson());
      return channel;
    }).toList();

    CacheService.save('channels', rawData);
    return _channelsCache!;
  }

  Future<List<Movie>> fetchMovies({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      if (_moviesCache != null) return _moviesCache!;
      final cached = await CacheService.get('movies');
      if (cached != null) {
        _moviesCache = (cached as List).map((e) => Movie.fromJson(e)).toList();
        return _moviesCache!;
      }
    }

    final c = await _getCreds();
    
    final results = await Future.wait([
      _client.get(Uri.parse(_buildUrl(c, action: 'get_vod_categories'))),
      _client.get(Uri.parse(_buildUrl(c, action: 'get_vod_streams'))),
    ]);

    if (results[0].statusCode != 200 || results[1].statusCode != 200) {
      throw Exception('Erreur lors du chargement des films');
    }

    final List catsData = json.decode(results[0].body);
    final List streamsData = json.decode(results[1].body);

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    final List<Map<String, dynamic>> rawData = [];
    _moviesCache = streamsData.map((s) {
      final catId = s['category_id'].toString();
      final ext = s['container_extension'] ?? 'mp4';
      final movie = Movie(
        id: int.parse(s['stream_id'].toString()),
        name: _cleanName(s['name']),
        url: '${c.host}/movie/${c.user}/${c.pass}/${s['stream_id']}.$ext',
        cover: s['stream_icon'],
        group: catMap[catId] ?? "Autres",
        rating: s['rating']?.toString(),
      );
      rawData.add(movie.toJson());
      return movie;
    }).toList();

    CacheService.save('movies', rawData);
    return _moviesCache!;
  }

  Future<MovieDetail> fetchMovieDetail(int id) async {
    final cached = await CacheService.get('movie_detail_$id');
    if (cached != null) return MovieDetail.fromJson(cached);

    final c = await _getCreds();
    final res = await _client.get(Uri.parse(_buildUrl(c, action: 'get_vod_info', other: '&vod_id=$id')));
    
    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      final info = data['info'] ?? {};
      final movieData = data['movie_data'] ?? {};
      final ext = movieData['container_extension'] ?? 'mp4';

      final detail = MovieDetail(
        id: id,
        name: _cleanName(movieData['name'] ?? ""),
        url: '${c.host}/movie/${c.user}/${c.pass}/${movieData['stream_id']}.$ext',
        cover: info['movie_image'],
        coverBig: info['movie_image'],
        description: info['plot'],
        duration: info['duration'],
        genre: info['genre'],
        cast: info['cast'],
        director: info['director'],
        year: info['releasedate'],
        rating: info['rating']?.toString(),
      );
      CacheService.save('movie_detail_$id', detail.toJson());
      return detail;
    }
    throw Exception('Erreur lors du chargement du détail du film');
  }

  Future<List<SeriesItem>> fetchSeries({bool forceRefresh = false}) async {
    if (!forceRefresh) {
      if (_seriesCache != null) return _seriesCache!;
      final cached = await CacheService.get('series');
      if (cached != null) {
        _seriesCache = (cached as List).map((e) => SeriesItem.fromJson(e)).toList();
        return _seriesCache!;
      }
    }

    final c = await _getCreds();
    
    final results = await Future.wait([
      _client.get(Uri.parse(_buildUrl(c, action: 'get_series_categories'))),
      _client.get(Uri.parse(_buildUrl(c, action: 'get_series'))),
    ]);

    if (results[0].statusCode != 200 || results[1].statusCode != 200) {
      throw Exception('Erreur lors du chargement des séries');
    }

    final List catsData = json.decode(results[0].body);
    final List streamsData = json.decode(results[1].body);

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    final List<Map<String, dynamic>> rawData = [];
    _seriesCache = streamsData.map((s) {
      final catId = s['category_id'].toString();
      final series = SeriesItem(
        id: int.parse(s['series_id'].toString()),
        name: _cleanName(s['name']),
        cover: s['cover'],
        group: catMap[catId] ?? "Autres",
        rating: s['rating']?.toString(),
      );
      rawData.add(series.toJson());
      return series;
    }).toList();

    CacheService.save('series', rawData);
    return _seriesCache!;
  }

  Future<SeriesDetail> fetchSeriesDetail(int seriesId) async {
    final cached = await CacheService.get('series_detail_$seriesId');
    if (cached != null) return SeriesDetail.fromJson(cached);

    final c = await _getCreds();
    final res = await _client.get(Uri.parse(_buildUrl(c, action: 'get_series_info', other: '&series_id=$seriesId')));
    
    if (res.statusCode == 200) {
      final data = json.decode(res.body);
      final info = data['info'] ?? {};
      final episodesData = data['episodes'] as Map<String, dynamic>? ?? {};

      final Map<String, List<Episode>> seasons = {};

      episodesData.forEach((seasonNum, episodes) {
        final List epsList = episodes as List;
        seasons[seasonNum] = epsList.map<Episode>((e) {
          final ext = e['container_extension'] ?? 'mp4';
          return Episode(
            id: int.tryParse(e['id'].toString()) ?? 0,
            title: e['title'] ?? "Épisode ${e['episode_num']}",
            season: int.tryParse(seasonNum) ?? 0,
            episodeNum: int.tryParse(e['episode_num'].toString()) ?? 0,
            url: '${c.host}/series/${c.user}/${c.pass}/${e['id']}.$ext',
            plot: e['info']?['plot'],
            cover: e['info']?['movie_image'],
            duration: e['info']?['duration'],
          );
        }).toList();
      });

      final detail = SeriesDetail(
        id: seriesId,
        name: _cleanName(info['name'] ?? ""),
        cover: info['cover'],
        plot: info['plot'],
        seasons: seasons,
      );
      CacheService.save('series_detail_$seriesId', detail.toJson());
      return detail;
    }
    throw Exception('Erreur lors du chargement du détail de la série');
  }
}
