class Channel {
  final String name;
  final String url;
  final String? logo;
  final String? group;

  Channel({required this.name, required this.url, this.logo, this.group});

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      name: json['name'] as String,
      url: json['url'] as String,
      logo: json['logo'] as String?,
      group: json['group'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'url': url,
    'logo': logo,
    'group': group,
  };
}
