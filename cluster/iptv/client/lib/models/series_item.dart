class SeriesItem {
  final int id;
  final String name;
  final String? cover;
  final String? group;
  final String? rating;

  SeriesItem({required this.id, required this.name, this.cover, this.group, this.rating});

  factory SeriesItem.fromJson(Map<String, dynamic> j) => SeriesItem(
    id: j['id'] as int,
    name: j['name'] as String,
    cover: j['cover'] as String?,
    group: j['group'] as String?,
    rating: j['rating'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'cover': cover,
    'group': group,
    'rating': rating,
  };
}
