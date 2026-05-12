import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/channel.dart';

class ApiService {
  static const String baseUrl = 'http://iptv-api.duckdns.org/api/v1';

  Future<List<Channel>> fetchChannels() async {
    final response = await http.get(Uri.parse('$baseUrl/channels'));
    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(response.bodyBytes));
      return data.map((j) => Channel.fromJson(j)).toList();
    } else {
      throw Exception('Erreur serveur: ${response.statusCode}');
    }
  }
}
