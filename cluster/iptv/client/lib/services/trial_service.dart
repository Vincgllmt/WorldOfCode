import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class TrialService {
  static const String _trialStartDateKey = 'trial_start_date';
  static const String _isProKey = 'is_pro_user';
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

  /// Récupère le nombre de jours restants
  Future<int> getRemainingDays() async {
    if (await isPro()) return 999;

    final prefs = await SharedPreferences.getInstance();
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
    final pro = await isPro();
    if (pro) return true;
    final remaining = await getRemainingDays();
    return remaining > 0;
  }

  /// Vérifie si l'utilisateur a acheté la version complète
  Future<bool> isPro() async {
    // On vérifie d'abord les SharedPreferences (instantané)
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(_isProKey) == true) return true;

    // Ensuite le stockage sécurisé (sécurité)
    final isProStr = await _storage.read(key: _isProKey);
    if (isProStr == 'true') {
      // On resynchronise prefs si besoin
      await prefs.setBool(_isProKey, true);
      return true;
    }
    return false;
  }

  /// Marque l'utilisateur comme "Pro" après achat
  Future<void> setPro() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_isProKey, true);
    await _storage.write(key: _isProKey, value: 'true');
  }

  /// REINITIALISE TOUT (Pour le test uniquement)
  Future<void> resetAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_trialStartDateKey);
    await prefs.remove(_isProKey);
    await _storage.delete(key: _trialStartDateKey);
    await _storage.delete(key: _isProKey);
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
