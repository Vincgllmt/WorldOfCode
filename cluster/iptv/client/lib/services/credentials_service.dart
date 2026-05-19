import 'package:flutter_secure_storage/flutter_secure_storage.dart';

enum PlaylistType { xtream, m3u }

class Credentials {
  final String host;
  final String? user;
  final String? pass;
  final PlaylistType type;
  const Credentials({required this.host, this.user, this.pass, this.type = PlaylistType.xtream});

  bool get isXtream => type == PlaylistType.xtream;
}

class CredentialsService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _keyHost = 'xtream_host';
  static const _keyUser = 'xtream_user';
  static const _keyPass = 'xtream_pass';
  static const _keyType = 'playlist_type';

  static Future<Credentials?> load() async {
    final host = await _storage.read(key: _keyHost);
    final user = await _storage.read(key: _keyUser);
    final pass = await _storage.read(key: _keyPass);
    final typeStr = await _storage.read(key: _keyType);
    
    final type = typeStr == 'm3u' ? PlaylistType.m3u : PlaylistType.xtream;

    if (host != null && host.isNotEmpty) {
      if (type == PlaylistType.m3u) {
        return Credentials(host: host, type: PlaylistType.m3u);
      }
      if (user != null && pass != null && user.isNotEmpty && pass.isNotEmpty) {
        return Credentials(host: host, user: user, pass: pass, type: PlaylistType.xtream);
      }
    }
    return null;
  }

  static Future<void> save(Credentials creds) async {
    await Future.wait([
      _storage.write(key: _keyHost, value: creds.host),
      _storage.write(key: _keyUser, value: creds.user ?? ''),
      _storage.write(key: _keyPass, value: creds.pass ?? ''),
      _storage.write(key: _keyType, value: creds.type == PlaylistType.m3u ? 'm3u' : 'xtream'),
    ]);
  }

  static Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _keyHost),
      _storage.delete(key: _keyUser),
      _storage.delete(key: _keyPass),
      _storage.delete(key: _keyType),
    ]);
  }

  // Parses URLs. If it has username/password, it's Xtream. Otherwise it's Raw M3U.
  static Credentials? parseUrl(String raw) {
    try {
      final uri = Uri.parse(raw.trim());
      final user = uri.queryParameters['username'];
      final pass = uri.queryParameters['password'];
      
      if (user != null && pass != null && user.isNotEmpty && pass.isNotEmpty) {
        final port = uri.hasPort ? ':${uri.port}' : '';
        final host = '${uri.scheme}://${uri.host}$port';
        return Credentials(host: host, user: user, pass: pass, type: PlaylistType.xtream);
      }
      
      // If it's a direct link to a .m3u or .m3u8 file
      if (uri.path.endsWith('.m3u') || uri.path.endsWith('.m3u8') || uri.query.contains('m3u')) {
        return Credentials(host: raw.trim(), type: PlaylistType.m3u);
      }
      
      return null;
    } catch (_) {
      return null;
    }
  }
}
