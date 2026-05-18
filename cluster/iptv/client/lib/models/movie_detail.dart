class MovieDetail {
  final int id;
  final String name;
  final String url;
  final String? cover;
  final String? coverBig;
  final String? description;
  final String? duration;
  final String? genre;
  final String? cast;
  final String? director;
  final String? year;
  final String? rating;

  const MovieDetail({
    required this.id,
    required this.name,
    required this.url,
    this.cover,
    this.coverBig,
    this.description,
    this.duration,
    this.genre,
    this.cast,
    this.director,
    this.year,
    this.rating,
  });

  factory MovieDetail.fromJson(Map<String, dynamic> j) => MovieDetail(
    id: j['id'] as int,
    name: j['name'] as String,
    url: j['url'] as String,
    cover: j['cover'] as String?,
    coverBig: j['cover_big'] as String?,
    description: j['description'] as String?,
    duration: j['duration'] as String?,
    genre: j['genre'] as String?,
    cast: j['cast'] as String?,
    director: j['director'] as String?,
    year: j['year'] as String?,
    rating: j['rating'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'url': url,
    'cover': cover,
    'cover_big': coverBig,
    'description': description,
    'duration': duration,
    'genre': genre,
    'cast': cast,
    'director': director,
    'year': year,
    'rating': rating,
  };
}
