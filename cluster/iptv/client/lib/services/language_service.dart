import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageService {
  static final LanguageService _instance = LanguageService._internal();
  factory LanguageService() => _instance;
  LanguageService._internal();

  final ValueNotifier<String> locale = ValueNotifier('fr');

  static const Map<String, Map<String, String>> _translations = {
    'fr': {
      'live': 'Live',
      'movies': 'Films',
      'series': 'Séries',
      'back_to_themes': 'RETOUR AUX THÈMES',
      'continue_watching': '► Reprendre la lecture',
      'search_hint': 'Titre, genre...',
      'search_hint_live': 'Chaîne, catégorie...',
      'view_mode': 'Mode d\'affichage',
      'view_themes': 'Thèmes (Liste)',
      'view_grid_small': 'Grille (Petite)',
      'view_grid_medium': 'Grille (Moyenne)',
      'view_grid_large': 'Grille (Grande)',
      'logout_title': 'Paramètres',
      'logout_confirm': 'Voulez-vous vous déconnecter ?',
      'logout_desc': 'Vos identifiants seront supprimés de cet appareil.',
      'cancel': 'Annuler',
      'logout': 'Déconnecter',
      'language': 'Langue',
      'french': 'Français',
      'english': 'English',
      'no_connection': 'Connexion impossible',
      'retry': 'Réessayer',
      'loading_channels': 'Chargement des chaînes...',
      'loading_movies': 'Chargement des films...',
      'loading_series': 'Chargement des séries...',
      'results_for': 'Résultats pour',
    },
    'en': {
      'live': 'Live TV',
      'movies': 'Movies',
      'series': 'Series',
      'back_to_themes': 'BACK TO THEMES',
      'continue_watching': '► Continue Watching',
      'search_hint': 'Title, genre...',
      'search_hint_live': 'Channel, category...',
      'view_mode': 'Display Mode',
      'view_themes': 'Themes (List)',
      'view_grid_small': 'Grid (Small)',
      'view_grid_medium': 'Grid (Medium)',
      'view_grid_large': 'Grid (Large)',
      'logout_title': 'Settings',
      'logout_confirm': 'Do you want to logout?',
      'logout_desc': 'Your credentials will be removed from this device.',
      'cancel': 'Cancel',
      'logout': 'Logout',
      'language': 'Language',
      'french': 'French',
      'english': 'English',
      'no_connection': 'No connection',
      'retry': 'Retry',
      'loading_channels': 'Loading channels...',
      'loading_movies': 'Loading movies...',
      'loading_series': 'Loading series...',
      'results_for': 'Results for',
    }
  };

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    locale.value = prefs.getString('language') ?? 'fr';
  }

  void setLanguage(String lang) async {
    locale.value = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
  }

  String t(String key) {
    return _translations[locale.value]?[key] ?? key;
  }
}

final lang = LanguageService();
