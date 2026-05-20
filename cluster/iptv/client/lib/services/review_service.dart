import 'package:shared_preferences/shared_preferences.dart';
import 'package:in_app_review/in_app_review.dart';
import 'dart:io';

class ReviewService {
  static final InAppReview _inAppReview = InAppReview.instance;
  static const String _launchCountKey = 'launch_count';
  static const String _lastReviewRequestKey = 'last_review_request';

  static Future<void> trackLaunch() async {
    // We only want to track launches on Mobile
    if (!Platform.isAndroid && !Platform.isIOS) return;

    final prefs = await SharedPreferences.getInstance();
    int launches = prefs.getInt(_launchCountKey) ?? 0;
    launches++;
    await prefs.setInt(_launchCountKey, launches);

    // If it's a "multiple of 10" launch, try to show the review dialog
    // Google Play has its own internal quota, so it won't show every time
    if (launches >= 5 && launches % 10 == 0) {
      final lastRequest = prefs.getInt(_lastReviewRequestKey) ?? 0;
      final now = DateTime.now().millisecondsSinceEpoch;
      
      // Don't ask more than once every 15 days
      if (now - lastRequest > 1000 * 60 * 60 * 24 * 15) {
        requestReview();
        await prefs.setInt(_lastReviewRequestKey, now);
      }
    }
  }

  static Future<void> requestReview() async {
    if (await _inAppReview.isAvailable()) {
      _inAppReview.requestReview();
    }
  }

  static Future<void> openStore() async {
    _inAppReview.openStoreListing();
  }
}
