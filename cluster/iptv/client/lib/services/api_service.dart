import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import '../models/channel.dart';
import '../models/movie.dart';
import '../models/movie_detail.dart';
import '../models/series_item.dart';
import '../models/series_detail.dart';
import '../models/epg_program.dart';
import '../utils/text_utils.dart';
import 'credentials_service.dart';
import 'cache_service.dart';
import 'm3u_parser_service.dart';

class ApiService {
  // In-memory cache so we don't hit secure storage on every request.
  static Credentials? _creds;

  // In-memory data cache
  static List<Channel>? _channelsCache;
  static List<Movie>? _moviesCache;
  static List<SeriesItem>? _seriesCache;
  static List<M3uItem>? _m3uDataCache;

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
    _m3uDataCache = null;
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

  Future<List<M3uItem>> _fetchM3u(Credentials c) async {
    if (_m3uDataCache != null) return _m3uDataCache!;
    
    String content;
    if (c.host.startsWith('http')) {
      final res = await _client.get(Uri.parse(c.host));
      if (res.statusCode != 200) throw Exception('Impossible de télécharger le fichier M3U');
      content = res.body;
    } else {
      // Local file
      final file = File(c.host);
      if (!await file.exists()) throw Exception('Fichier local introuvable');
      content = await file.readAsString();
    }
    
    _m3uDataCache = M3uParserService.parse(content);
    return _m3uDataCache!;
  }

  // ─── Cleaning Logic (Translated from Python) ───────────────────────────────

  static final RegExp _displayTags = RegExp(r'\s*[\(\[][^\)\]]*[\)\]]|\s*[-|│‖]{1,3}\s*\w*\s*[-|│‖]{1,3}');
  static final RegExp _specialChars = RegExp(r'[★☆✪✦◈❤♛♕❖◆▶►•·]+');
  static final RegExp _multiSpaces = RegExp(r'\s{2,}');
  static final RegExp _catFilter = RegExp(r'[^\x20-\x7E\xA0-\xFF]', unicode: true);

  static String _cleanName(String name) {
    final decoded = decodeIfNeeded(name);
    String cleaned = decoded.replaceAll(_displayTags, '').trim();
    cleaned = cleaned.replaceAll(_specialChars, '').trim();
    cleaned = cleaned.replaceAll(_multiSpaces, ' ');
    return cleaned.isEmpty ? decoded.trim() : cleaned;
  }

  static String _cleanCat(String name) {
    final decoded = decodeIfNeeded(name);
    // Keep standard ASCII and Latin-1 supplement (accents), remove others
    String cleaned = decoded.replaceAll(_catFilter, '').trim();
    cleaned = cleaned.replaceAll(_multiSpaces, ' ');
    return cleaned.isEmpty ? (decoded.isNotEmpty ? decoded : "Autres") : cleaned;
  }

  // ─── Endpoints ─────────────────────────────────────────────────────────────

  Future<bool> validate(Credentials creds) async {
    try {
      if (!creds.isXtream) {
        // Simple check if URL/File is accessible
        if (creds.host.startsWith('http')) {
          final res = await _client.head(Uri.parse(creds.host)).timeout(const Duration(seconds: 5));
          return res.statusCode == 200;
        } else {
          return await File(creds.host).exists();
        }
      }
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

    if (!c.isXtream) {
      final m3u = await _fetchM3u(c);
      _channelsCache = m3u.where((i) => i.type == 'live').map((i) => Channel(
        name: _cleanName(i.name),
        url: i.url,
        logo: i.logo,
        group: i.group != null ? _cleanCat(i.group!) : "Autres",
      )).toList();
    } else {
      // Fetch categories and streams in parallel
      final results = await Future.wait([
        _client.get(Uri.parse(_buildUrl(c, action: 'get_live_categories'))),
        _client.get(Uri.parse(_buildUrl(c, action: 'get_live_streams'))),
      ]);

      if (results[0].statusCode != 200 || results[1].statusCode != 200) {
        throw Exception('Erreur lors du chargement des chaînes');
      }

      _channelsCache = await compute(_parseChannels, {
        'cats': results[0].body,
        'streams': results[1].body,
        'host': c.host,
        'user': c.user,
        'pass': c.pass,
      });
    }

    CacheService.save('channels', _channelsCache!.map((e) => e.toJson()).toList());
    return _channelsCache!;
  }

  static List<Channel> _parseChannels(Map<String, dynamic> params) {
    final List catsData = json.decode(params['cats']);
    final List streamsData = json.decode(params['streams']);
    final String host = params['host'];
    final String user = params['user'];
    final String pass = params['pass'];

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    return streamsData.map((s) {
      final catId = s['category_id'].toString();
      return Channel(
        name: _cleanName(s['name']),
        url: '$host/live/$user/$pass/${s['stream_id']}.ts',
        logo: s['stream_icon'],
        group: catMap[catId] ?? "Autres",
        streamId: int.tryParse(s['stream_id'].toString()),
        epgId: s['epg_channel_id']?.toString(),
      );
    }).toList();
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

    if (!c.isXtream) {
      final m3u = await _fetchM3u(c);
      int idCounter = 1;
      _moviesCache = m3u.where((i) => i.type == 'movie').map((i) => Movie(
        id: idCounter++,
        name: _cleanName(i.name),
        url: i.url,
        cover: i.logo,
        group: i.group != null ? _cleanCat(i.group!) : "Autres",
      )).toList();
    } else {
      final results = await Future.wait([
        _client.get(Uri.parse(_buildUrl(c, action: 'get_vod_categories'))),
        _client.get(Uri.parse(_buildUrl(c, action: 'get_vod_streams'))),
      ]);

      if (results[0].statusCode != 200 || results[1].statusCode != 200) {
        throw Exception('Erreur lors du chargement des films');
      }

      _moviesCache = await compute(_parseMovies, {
        'cats': results[0].body,
        'streams': results[1].body,
        'host': c.host,
        'user': c.user,
        'pass': c.pass,
      });
    }

    CacheService.save('movies', _moviesCache!.map((e) => e.toJson()).toList());
    return _moviesCache!;
  }

  static List<Movie> _parseMovies(Map<String, dynamic> params) {
    final List catsData = json.decode(params['cats']);
    final List streamsData = json.decode(params['streams']);
    final String host = params['host'];
    final String user = params['user'];
    final String pass = params['pass'];

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    return streamsData.map((s) {
      final catId = s['category_id'].toString();
      final ext = s['container_extension'] ?? 'mp4';
      return Movie(
        id: int.parse(s['stream_id'].toString()),
        name: _cleanName(s['name']),
        url: '$host/movie/$user/$pass/${s['stream_id']}.$ext',
        cover: s['stream_icon'],
        group: catMap[catId] ?? "Autres",
        rating: s['rating']?.toString(),
      );
    }).toList();
  }

  Future<MovieDetail> fetchMovieDetail(int id) async {
    final c = await _getCreds();
    if (!c.isXtream) {
      // For M3U, detail is just the item from the cache
      final movies = await fetchMovies();
      final movie = movies.firstWhere((m) => m.id == id);
      return MovieDetail(
        id: movie.id,
        name: movie.name,
        url: movie.url,
        cover: movie.cover,
      );
    }

    final cached = await CacheService.get('movie_detail_$id');
    if (cached != null) return MovieDetail.fromJson(cached);

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
        description: info['plot'] != null ? decodeIfNeeded(info['plot']) : null,
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

    if (!c.isXtream) {
      final m3u = await _fetchM3u(c);
      int idCounter = 1;
      _seriesCache = m3u.where((i) => i.type == 'series').map((i) => SeriesItem(
        id: idCounter++,
        name: _cleanName(i.name),
        cover: i.logo,
        group: i.group != null ? _cleanCat(i.group!) : "Autres",
      )).toList();
    } else {
      final results = await Future.wait([
        _client.get(Uri.parse(_buildUrl(c, action: 'get_series_categories'))),
        _client.get(Uri.parse(_buildUrl(c, action: 'get_series'))),
      ]);

      if (results[0].statusCode != 200 || results[1].statusCode != 200) {
        throw Exception('Erreur lors du chargement des séries');
      }

      _seriesCache = await compute(_parseSeries, {
        'cats': results[0].body,
        'streams': results[1].body,
      });
    }

    CacheService.save('series', _seriesCache!.map((e) => e.toJson()).toList());
    return _seriesCache!;
  }

  static List<SeriesItem> _parseSeries(Map<String, dynamic> params) {
    final List catsData = json.decode(params['cats']);
    final List streamsData = json.decode(params['streams']);

    final Map<String, String> catMap = {
      for (var item in catsData) item['category_id'].toString(): _cleanCat(item['category_name'])
    };

    return streamsData.map((s) {
      final catId = s['category_id'].toString();
      return SeriesItem(
        id: int.parse(s['series_id'].toString()),
        name: _cleanName(s['name']),
        cover: s['cover'],
        group: catMap[catId] ?? "Autres",
        rating: s['rating']?.toString(),
      );
    }).toList();
  }

  Future<SeriesDetail> fetchSeriesDetail(int seriesId) async {
    final c = await _getCreds();
    if (!c.isXtream) {
      final series = await fetchSeries();
      final item = series.firstWhere((s) => s.id == seriesId);
      // We don't have episode info for Raw M3U unless we parse more, 
      // but usually raw M3Us have episodes as separate entries.
      return SeriesDetail(
        id: seriesId,
        name: item.name,
        cover: item.cover,
        seasons: {},
      );
    }

    final cached = await CacheService.get('series_detail_$seriesId');
    if (cached != null) return SeriesDetail.fromJson(cached);

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
          final title = e['title'] != null ? _cleanName(e['title']) : "Épisode ${e['episode_num']}";
          return Episode(
            id: int.tryParse(e['id'].toString()) ?? 0,
            title: title,
            season: int.tryParse(seasonNum) ?? 0,
            episodeNum: int.tryParse(e['episode_num'].toString()) ?? 0,
            url: '${c.host}/series/${c.user}/${c.pass}/${e['id']}.$ext',
            plot: e['info']?['plot'] != null ? decodeIfNeeded(e['info']!['plot']) : null,
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

  Future<List<EpgProgram>> fetchShortEpg(int streamId) async {
    final c = await _getCreds();
    if (!c.isXtream) return [];
    
    final url = _buildUrl(c, action: 'get_short_epg', other: '&stream_id=$streamId');
    
    try {
      final res = await _client.get(Uri.parse(url));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final listings = data['epg_listings'] as List?;
        if (listings != null) {
          return listings.map((e) => EpgProgram.fromJson(e)).toList();
        }
      }
    } catch (_) {}
    return [];
  }
}
