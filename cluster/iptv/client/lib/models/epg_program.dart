class EpgProgram {
  final String title;
  final DateTime start;
  final DateTime stop;
  final String? description;

  EpgProgram({
    required this.title,
    required this.start,
    required this.stop,
    this.description,
  });

  bool get isNow {
    final now = DateTime.now();
    return now.isAfter(start) && now.isBefore(stop);
  }

  factory EpgProgram.fromJson(Map<String, dynamic> j) {
    // Xtream Codes often returns base64 for strings, but get_short_epg 
    // usually returns plain text in epg_listings.
    return EpgProgram(
      title: j['title'] ?? '',
      start: DateTime.fromMillisecondsSinceEpoch(int.tryParse(j['start_timestamp']?.toString() ?? '0')! * 1000),
      stop: DateTime.fromMillisecondsSinceEpoch(int.tryParse(j['stop_timestamp']?.toString() ?? '0')! * 1000),
      description: j['description'],
    );
  }
}
