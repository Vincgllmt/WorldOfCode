import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TrialService {
  static const String _trialStartDateKey = 'trial_start_date';
  static const String _isProKey = 'is_pro_user';
  static const String _expiryDateKey = 'subscription_expiry_date';
  final _storage = const FlutterSecureStorage();

  /// Initialise la date de début au premier lancement
  Future<void> initTrial() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey(_trialStartDateKey)) {
      final now = DateTime.now().millisecondsSinceEpoch.toString();
      await prefs.setString(_trialStartDateKey, now);
      await _storage.write(key: _trialStartDateKey, value: now);
    }
  }

  /// Récupère le nombre de jours restants (essai ou abonnement)
  Future<int> getRemainingDays() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Si Pro à vie
    if (await isPro()) return 999;

    // Vérifier abonnement temporaire (mensuel/annuel)
    String? expiryStr = prefs.getString(_expiryDateKey);
    expiryStr ??= await _storage.read(key: _expiryDateKey);
    
    if (expiryStr != null) {
      final expiryDate = DateTime.fromMillisecondsSinceEpoch(int.parse(expiryStr));
      final diff = expiryDate.difference(DateTime.now()).inDays;
      if (diff > 0) return diff;
    }

    // Sinon période d'essai
    String? dateStr = prefs.getString(_trialStartDateKey);
    dateStr ??= await _storage.read(key: _trialStartDateKey);

    if (dateStr == null) return 3;

    final startDate = DateTime.fromMillisecondsSinceEpoch(int.parse(dateStr));
    final difference = DateTime.now().difference(startDate).inDays;
    
    final remaining = 3 - difference;
    return remaining < 0 ? 0 : remaining;
  }

  /// Vérifie si l'utilisateur a accès (soit en essai, soit a payé)
  Future<bool> hasAccess() async {
    final remaining = await getRemainingDays();
    return remaining > 0;
  }

  /// Vérifie si l'utilisateur a PAYÉ (Abonnement ou Pro)
  Future<bool> isPremium() async {
    final prefs = await SharedPreferences.getInstance();
    
    // Check Pro (Lifetime)
    if (await isPro()) return true;

    // Check Subscription
    String? expiryStr = prefs.getString(_expiryDateKey);
    expiryStr ??= await _storage.read(key: _expiryDateKey);
    
    if (expiryStr != null) {
      final expiryDate = DateTime.fromMillisecondsSinceEpoch(int.parse(expiryStr));
      return expiryDate.isAfter(DateTime.now());
    }

    return false;
  }

  /// Vérifie si l'utilisateur a acheté la version complète (A VIE)
  Future<bool> isPro() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_isProKey) == true) return true;
    final isProStr = await _storage.read(key: _isProKey);
    if (isProStr == 'true') {
      await prefs.setBool(_isProKey, true);
      return true;
    }
    return false;
  }

  /// Marque l'utilisateur comme "Pro" (LIFETIME)
  Future<void> setPro() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isProKey, true);
    await _storage.write(key: _isProKey, value: 'true');
  }

  /// Active un abonnement temporaire (MONTHLY or YEARLY)
  Future<void> activateSubscription(Duration duration) async {
    final prefs = await SharedPreferences.getInstance();
    final expiry = DateTime.now().add(duration).millisecondsSinceEpoch.toString();
    await prefs.setString(_expiryDateKey, expiry);
    await _storage.write(key: _expiryDateKey, value: expiry);
  }

  /// REINITIALISE TOUT (Pour le test uniquement)
  Future<void> resetAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_trialStartDateKey);
    await prefs.remove(_isProKey);
    await prefs.remove(_expiryDateKey);
    await _storage.delete(key: _trialStartDateKey);
    await _storage.delete(key: _isProKey);
    await _storage.delete(key: _expiryDateKey);
  }

  /// SIMULE l'expiration (Pour le test uniquement)
  Future<void> debugSetExpired() async {
    final expiredDate = DateTime.now().subtract(const Duration(days: 4)).millisecondsSinceEpoch.toString();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_trialStartDateKey, expiredDate);
    await _storage.write(key: _trialStartDateKey, value: expiredDate);
    await prefs.setBool(_isProKey, false);
    await _storage.delete(key: _isProKey);
  }
}
