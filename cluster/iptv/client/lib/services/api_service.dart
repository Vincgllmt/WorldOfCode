import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/channel.dart';

class ApiService {
  static const String baseUrl = 'http://127.0.0.1:8000/api/v1';

  Future<List<Channel>> fetchChannels() async {
    final response = await http.get(Uri.parse('$baseUrl/channels'));

    if (response.statusCode == 200) {
      final List<dynamic> data = json.decode(utf8.decode(response.bodyBytes));
      return data.map((json) => Channel.fromJson(json)).toList();
    } else {
      throw Exception('Impossible de charger la liste TNT');
    }
  }
}