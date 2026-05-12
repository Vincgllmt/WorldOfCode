class Movie {
  final int id;
  final String name;
  final String url;
  final String? cover;
  final String? group;
  final String? rating;

  Movie({required this.id, required this.name, required this.url, this.cover, this.group, this.rating});

  factory Movie.fromJson(Map<String, dynamic> j) => Movie(
    id: j['id'] as int,
    name: j['name'] as String,
    url: j['url'] as String,
    cover: j['cover'] as String?,
    group: j['group'] as String?,
    rating: j['rating'] as String?,
  );
}
