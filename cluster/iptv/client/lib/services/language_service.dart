import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageService {
  static final LanguageService _instance = LanguageService._internal();
  factory LanguageService() => _instance;
  LanguageService._internal();

  final ValueNotifier<String> locale = ValueNotifier('fr');

  final Map<String, Map<String, String>> _translations = {
    'fr': {
      'live': 'Direct TV',
      'movies': 'Films',
      'series': 'Séries',
      'search_hint': 'Rechercher...',
      'loading_channels': 'Chargement des chaînes...',
      'loading_movies': 'Chargement des films...',
      'loading_series': 'Chargement des séries...',
      'no_connection': 'Pas de connexion',
      'retry': 'Réessayer',
      'other': 'Autres',
      'results_for': 'Résultats pour',
      'continue_watching': 'Reprendre la lecture',
      'back_to_themes': 'Retour aux thèmes',
      'view_mode': 'Mode d\'affichage',
      'view_themes': 'Thèmes',
      'view_grid_small': 'Grille (Petit)',
      'view_grid_medium': 'Grille (Moyen)',
      'view_grid_large': 'Grille (Grand)',
      'logout': 'Déconnexion',
      'logout_confirm': 'Se déconnecter ?',
      'logout_desc': 'Toutes vos données locales seront conservées sur cet appareil.',
      'logout_title': 'Paramètres & Compte',
      'language': 'Langue',
      'settings': 'Paramètres',
      'track': 'Piste',
      'cancel': 'Annuler',
      'back': 'Retour',
      'season': 'Saison',
      'seasons': 'Saisons',
      'episode': 'Épisode',
      'episodes': 'Épisodes',
      'next_episode': 'Épisode suivant',
      'synopsis': 'Synopsis',
      'play_movie': 'Regarder le film',
      'no_description': 'Aucune description disponible.',
      'cast': 'Distribution',
      'director': 'Réalisateur',
      'delete_download_title': 'Supprimer le téléchargement ?',
      'delete_download_confirm': 'Voulez-vous supprimer',
      'delete': 'Supprimer',
      'downloads': 'Téléchargements',
      'no_downloads': 'Aucun téléchargement pour le moment.',
    },
    'en': {
      'live': 'Live TV',
      'movies': 'Movies',
      'series': 'Series',
      'search_hint': 'Search...',
      'loading_channels': 'Loading channels...',
      'loading_movies': 'Loading movies...',
      'loading_series': 'Loading series...',
      'no_connection': 'No connection',
      'retry': 'Retry',
      'other': 'Other',
      'results_for': 'Results for',
      'continue_watching': 'Continue Watching',
      'back_to_themes': 'Back to themes',
      'view_mode': 'View Mode',
      'view_themes': 'Themes',
      'view_grid_small': 'Grid (Small)',
      'view_grid_medium': 'Grid (Medium)',
      'view_grid_large': 'Grid (Large)',
      'logout': 'Logout',
      'logout_confirm': 'Logout?',
      'logout_desc': 'All your local data will be kept on this device.',
      'logout_title': 'Settings & Account',
      'language': 'Language',
      'settings': 'Settings',
      'track': 'Track',
      'cancel': 'Cancel',
      'back': 'Back',
      'season': 'Season',
      'seasons': 'Seasons',
      'episode': 'Episode',
      'episodes': 'Episodes',
      'next_episode': 'Next Episode',
      'synopsis': 'Synopsis',
      'play_movie': 'Play Movie',
      'no_description': 'No description available.',
      'cast': 'Cast',
      'director': 'Director',
      'delete_download_title': 'Delete Download?',
      'delete_download_confirm': 'Do you want to delete',
      'delete': 'Delete',
      'downloads': 'Downloads',
      'no_downloads': 'No downloads yet.',
    }
  };

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('language');
    if (saved != null) {
      locale.value = saved;
    }
  }

  Future<void> setLanguage(String lang) async {
    locale.value = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('language', lang);
  }

  String t(String key) {
    return _translations[locale.value]?[key] ?? key;
  }
}

final lang = LanguageService();
