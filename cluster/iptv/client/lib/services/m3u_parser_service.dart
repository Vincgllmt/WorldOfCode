import 'dart:io';
import '../models/channel.dart';
import '../models/movie.dart';
import '../models/series_item.dart';

class M3uItem {
  final String name;
  final String url;
  final String? logo;
  final String? group;
  final String type; // 'live', 'movie', 'series'

  M3uItem({required this.name, required this.url, this.logo, this.group, required this.type});
}

class M3uParserService {
  static List<M3uItem> parse(String content) {
    final List<M3uItem> items = [];
    final lines = content.split('\n');
    
    String? currentName;
    String? currentLogo;
    String? currentGroup;

    for (var line in lines) {
      line = line.trim();
      if (line.startsWith('#EXTINF:')) {
        // Extraction du nom
        final nameMatch = RegExp(r',([^,]*)$').firstMatch(line);
        currentName = nameMatch?.group(1)?.trim() ?? "Inconnu";

        // Extraction du logo
        final logoMatch = RegExp(r'tvg-logo="([^"]*)"').firstMatch(line);
        currentLogo = logoMatch?.group(1);

        // Extraction du groupe
        final groupMatch = RegExp(r'group-title="([^"]*)"').firstMatch(line);
        currentGroup = groupMatch?.group(1);
      } else if (line.isNotEmpty && !line.startsWith('#')) {
        if (currentName != null) {
          // Détection basique du type (souvent les liens M3U IPTV ont des patterns)
          String type = 'live';
          if (line.contains('/movie/') || line.endsWith('.mp4') || line.endsWith('.mkv')) {
            type = 'movie';
          } else if (line.contains('/series/')) {
            type = 'series';
          }

          items.add(M3uItem(
            name: currentName,
            url: line,
            logo: currentLogo,
            group: currentGroup,
            type: type,
          ));
        }
        currentName = null;
        currentLogo = null;
        currentGroup = null;
      }
    }
    return items;
  }
}
