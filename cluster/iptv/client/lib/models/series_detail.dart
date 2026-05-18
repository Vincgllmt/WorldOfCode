class Episode {
  final int id;
  final String title;
  final int season;
  final int episodeNum;
  final String url;
  final String? plot;
  final String? cover;
  final String? duration;

  Episode({
    required this.id,
    required this.title,
    required this.season,
    required this.episodeNum,
    required this.url,
    this.plot,
    this.cover,
    this.duration,
  });

  factory Episode.fromJson(Map<String, dynamic> j) => Episode(
    id: j['id'] as int,
    title: j['title'] as String,
    season: j['season'] as int,
    episodeNum: j['episode_num'] as int,
    url: j['url'] as String,
    plot: j['plot'] as String?,
    cover: j['cover'] as String?,
    duration: j['duration'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'title': title,
    'season': season,
    'episode_num': episodeNum,
    'url': url,
    'plot': plot,
    'cover': cover,
    'duration': duration,
  };
}

class SeriesDetail {
  final int id;
  final String name;
  final String? cover;
  final String? plot;
  final Map<String, List<Episode>> seasons;

  SeriesDetail({required this.id, required this.name, this.cover, this.plot, required this.seasons});

  factory SeriesDetail.fromJson(Map<String, dynamic> j) {
    final rawSeasons = j['seasons'] as Map<String, dynamic>? ?? {};
    final seasons = rawSeasons.map((k, v) => MapEntry(
      k,
      (v as List).map((e) => Episode.fromJson(e as Map<String, dynamic>)).toList(),
    ));
    return SeriesDetail(
      id: j['id'] as int,
      name: j['name'] as String,
      cover: j['cover'] as String?,
      plot: j['plot'] as String?,
      seasons: seasons,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'cover': cover,
    'plot': plot,
    'seasons': seasons.map((k, v) => MapEntry(k, v.map((e) => e.toJson()).toList())),
  };
}
