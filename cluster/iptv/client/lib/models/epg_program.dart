import '../utils/text_utils.dart';

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
    return EpgProgram(
      title: decodeIfNeeded(j['title'] ?? ''),
      start: DateTime.fromMillisecondsSinceEpoch(int.tryParse(j['start_timestamp']?.toString() ?? '0')! * 1000),
      stop: DateTime.fromMillisecondsSinceEpoch(int.tryParse(j['stop_timestamp']?.toString() ?? '0')! * 1000),
      description: j['description'] != null ? decodeIfNeeded(j['description']) : null,
    );
  }
}
