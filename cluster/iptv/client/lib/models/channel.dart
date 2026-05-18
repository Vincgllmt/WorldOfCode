class Channel {
  final String name;
  final String url;
  final String? logo;
  final String? group;
  final int? streamId;
  final String? epgId;

  Channel({
    required this.name, 
    required this.url, 
    this.logo, 
    this.group,
    this.streamId,
    this.epgId,
  });

  factory Channel.fromJson(Map<String, dynamic> json) {
    return Channel(
      name: json['name'] as String,
      url: json['url'] as String,
      logo: json['logo'] as String?,
      group: json['group'] as String?,
      streamId: json['streamId'] as int?,
      epgId: json['epgId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name,
    'url': url,
    'logo': logo,
    'group': group,
    if (streamId != null) 'streamId': streamId,
    if (epgId != null) 'epgId': epgId,
  };
}
