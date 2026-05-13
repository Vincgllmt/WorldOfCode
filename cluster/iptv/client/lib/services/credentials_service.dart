import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class Credentials {
  final String host;
  final String user;
  final String pass;
  const Credentials({required this.host, required this.user, required this.pass});
}

class CredentialsService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );
  static const _keyHost = 'xtream_host';
  static const _keyUser = 'xtream_user';
  static const _keyPass = 'xtream_pass';

  static Future<Credentials?> load() async {
    final host = await _storage.read(key: _keyHost);
    final user = await _storage.read(key: _keyUser);
    final pass = await _storage.read(key: _keyPass);
    if (host != null && user != null && pass != null &&
        host.isNotEmpty && user.isNotEmpty && pass.isNotEmpty) {
      return Credentials(host: host, user: user, pass: pass);
    }
    return null;
  }

  static Future<void> save(Credentials creds) async {
    await Future.wait([
      _storage.write(key: _keyHost, value: creds.host),
      _storage.write(key: _keyUser, value: creds.user),
      _storage.write(key: _keyPass, value: creds.pass),
    ]);
  }

  static Future<void> clear() async {
    await Future.wait([
      _storage.delete(key: _keyHost),
      _storage.delete(key: _keyUser),
      _storage.delete(key: _keyPass),
    ]);
  }

  // Parses Xtream Codes M3U URLs:
  // http://host:port/get.php?username=X&password=Y&type=m3u_plus
  // http://host:port/player_api.php?username=X&password=Y
  static Credentials? parseUrl(String raw) {
    try {
      final uri = Uri.parse(raw.trim());
      final user = uri.queryParameters['username'];
      final pass = uri.queryParameters['password'];
      if (user == null || pass == null || user.isEmpty || pass.isEmpty) return null;
      final port = uri.hasPort ? ':${uri.port}' : '';
      final host = '${uri.scheme}://${uri.host}$port';
      return Credentials(host: host, user: user, pass: pass);
    } catch (_) {
      return null;
    }
  }
}
