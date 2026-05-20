import 'package:flutter/material.dart';
import 'dart:io';
import 'package:google_fonts/google_fonts.dart';
import 'package:file_picker/file_picker.dart';
import '../main.dart';
import '../services/api_service.dart';
import '../services/credentials_service.dart';
import '../services/language_service.dart';
import '../widgets/brand_logo.dart';
import 'main_screen.dart';

class SetupScreen extends StatefulWidget {
  const SetupScreen({super.key});

  @override
  State<SetupScreen> createState() => _SetupScreenState();
}

class _SetupScreenState extends State<SetupScreen> {
  // Background éclairci vers le violet (0xFF160B25 au lieu de 0xFF0C0714)
  static const _bg     = Color(0xFF160B25);
  static const _bgCard = Color(0xFF1F1235);
  static const _accent = Color(0xFF9D4EDD);
  static const _txt    = Color(0xFFFFFFFF);
  static const _txtSub = Color(0xFFB0AEC8);
  static const _border = Color(0x449D4EDD);
  static const _err    = Color(0xFFCF6679);

  int _modeIndex = 0; // 0: M3U Link, 1: Credentials, 2: File
  bool _loading    = false;
  String? _error;
  String? _selectedFilePath;

  final _urlCtrl  = TextEditingController();
  final _hostCtrl = TextEditingController();
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  bool  _passVisible = false;

  @override
  void dispose() {
    _urlCtrl.dispose();
    _hostCtrl.dispose();
    _userCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['m3u', 'm3u8'],
      );

      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFilePath = result.files.single.path;
          _error = null;
        });
      }
    } catch (e) {
      setState(() => _error = "Erreur lors de la sélection du fichier : $e");
    }
  }

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });

    Credentials? creds;

    if (_modeIndex == 1) {
      final host = _hostCtrl.text.trim();
      final user = _userCtrl.text.trim();
      final pass = _passCtrl.text.trim();
      if (host.isEmpty || user.isEmpty || pass.isEmpty) {
        setState(() { _loading = false; _error = lang.t('setup_err_all_fields'); });
        return;
      }
      creds = Credentials(
        host: host.endsWith('/') ? host.substring(0, host.length - 1) : host,
        user: user,
        pass: pass,
        type: PlaylistType.xtream,
      );
    } else if (_modeIndex == 0) {
      final raw = _urlCtrl.text.trim();
      if (raw.isEmpty) {
        setState(() { _loading = false; _error = lang.t('setup_err_enter_m3u'); });
        return;
      }
      creds = CredentialsService.parseUrl(raw);
      if (creds == null) {
        setState(() {
          _loading = false;
          _error = lang.t('setup_err_invalid_m3u');
        });
        return;
      }
    } else {
      if (_selectedFilePath == null) {
        setState(() { _loading = false; _error = lang.t('setup_err_all_fields'); });
        return;
      }
      creds = Credentials(host: _selectedFilePath!, type: PlaylistType.m3u);
    }

    try {
      final ok = await ApiService().validate(creds);
      if (!ok) {
        setState(() { _loading = false; _error = lang.t('setup_err_invalid_creds'); });
        return;
      }
      await CredentialsService.save(creds);
      ApiService.invalidateCache();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainScreen()),
      );
    } catch (e) {
      setState(() { _loading = false; _error = '${lang.t('setup_err_connection')} $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final bool isTV = MediaQuery.of(context).size.shortestSide >= 600 || Platform.isAndroid; // Simplified TV detection or Android device (Box)
    
    return ValueListenableBuilder<String>(
      valueListenable: lang.locale,
      builder: (context, locale, _) {
        return Scaffold(
          backgroundColor: _bg,
          body: SafeArea(
            child: Stack(
              children: [
                Positioned.fill(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
                    child: Center(
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(maxWidth: 500),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const SizedBox(height: 40), // Top margin for language buttons
                            // Responsive Logo
                            GestureDetector(
                              onDoubleTap: () async {
                                await trialService.debugSetExpired();
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('DEBUG: Essai expiré (Redémarrez l\'app)')),
                                  );
                                }
                              },
                              onLongPress: () async {
                                await trialService.resetAll();
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('DEBUG: Données réinitialisées !')),
                                  );
                                }
                              },
                              child: Image.asset(
                                'assets/images/logo.png',
                                height: isTV ? 120 : 180, // Smaller on TV to save space
                                fit: BoxFit.contain,
                              ),
                            ),
                            const SizedBox(height: 24),
                            
                            // Styled encadré for "PURPLE IPTV"
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
                              decoration: BoxDecoration(
                                color: const Color(0xFF9D4EDD).withOpacity(0.1),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFBB86FC).withOpacity(0.3), width: 1.5),
                              ),
                              child: Text(
                                'PURPLE IPTV', // Force rebrand text
                                style: GoogleFonts.nunito(
                                  color: const Color(0xFFBB86FC),
                                  fontSize: 16,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 4,
                                ),
                              ),
                            ),
                            
                            const SizedBox(height: 32),
                            Text(
                              lang.t('setup_subtitle'),
                              textAlign: TextAlign.center,
                              style: const TextStyle(color: _txtSub, fontSize: 13, height: 1.5),
                            ),
                            const SizedBox(height: 24),

                            // Mode toggle
                            Container(
                              height: 46,
                              decoration: BoxDecoration(
                                color: _bgCard,
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: _border),
                              ),
                              child: Row(children: [
                                _Tab(label: lang.t('setup_m3u_tab'), active: _modeIndex == 0,
                                  onTap: () => setState(() { _modeIndex = 0; _error = null; })),
                                _Tab(label: lang.t('setup_manual_tab'),   active: _modeIndex == 1,
                                  onTap: () => setState(() { _modeIndex = 1;  _error = null; })),
                                _Tab(label: lang.t('setup_file_tab'),   active: _modeIndex == 2,
                                  onTap: () => setState(() { _modeIndex = 2;  _error = null; })),
                              ]),
                            ),
                            const SizedBox(height: 24),

                            // Fields
                            if (_modeIndex == 0) ...[
                              _Field(
                                ctrl: _urlCtrl,
                                hint: 'http://host:port/get.php?username=X&password=Y',
                                label: lang.t('setup_m3u_label'),
                                icon: Icons.link_rounded,
                                autofocus: false, // No autofocus on TV
                                onSubmitted: (_) => _submit(),
                              ),
                            ] else if (_modeIndex == 1) ...[
                              _Field(
                                ctrl: _hostCtrl,
                                hint: 'http://host:port',
                                label: lang.t('setup_server_label'),
                                icon: Icons.dns_rounded,
                                autofocus: false,
                              ),
                              const SizedBox(height: 14),
                              _Field(
                                ctrl: _userCtrl,
                                hint: lang.t('setup_user_hint'),
                                label: lang.t('setup_user_label'),
                                icon: Icons.person_rounded,
                                autofocus: false,
                              ),
                              const SizedBox(height: 14),
                              _Field(
                                ctrl: _passCtrl,
                                hint: lang.t('setup_pass_hint'),
                                label: lang.t('setup_pass_label'),
                                icon: Icons.lock_rounded,
                                obscure: !_passVisible,
                                autofocus: false,
                                suffix: IconButton(
                                  onPressed: () => setState(() => _passVisible = !_passVisible),
                                  icon: Icon(
                                    _passVisible ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                                    color: _txtSub, size: 18,
                                  ),
                                ),
                                onSubmitted: (_) => _submit(),
                              ),
                            ] else ...[
                              // File Picker Button
                              Material(
                                color: Colors.transparent,
                                child: InkWell(
                                  onTap: _pickFile,
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
                                    decoration: BoxDecoration(
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: _selectedFilePath != null ? _accent : _border),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(Icons.file_present_rounded, color: _accent, size: 20),
                                        const SizedBox(width: 14),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                lang.t('setup_file_label'),
                                                style: const TextStyle(color: _txtSub, fontSize: 13),
                                              ),
                                              if (_selectedFilePath != null)
                                                Padding(
                                                  padding: const EdgeInsets.only(top: 4),
                                                  child: Text(
                                                    _selectedFilePath!.split('/').last,
                                                    style: const TextStyle(color: _txt, fontSize: 14, fontWeight: FontWeight.bold),
                                                    maxLines: 1,
                                                    overflow: TextOverflow.ellipsis,
                                                  ),
                                                )
                                              else
                                                Padding(
                                                  padding: const EdgeInsets.only(top: 4),
                                                  child: Text(
                                                    lang.t('setup_file_hint'),
                                                    style: TextStyle(color: _txtSub.withOpacity(0.3), fontSize: 12),
                                                  ),
                                                ),
                                            ],
                                          ),
                                        ),
                                        if (_selectedFilePath != null)
                                          const Icon(Icons.check_circle_rounded, color: Colors.green, size: 20),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                            ],

                            // Error
                            if (_error != null) ...[
                              const SizedBox(height: 20),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: _err.withOpacity(0.12),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: _err.withOpacity(0.4)),
                                ),
                                child: Text(_error!,
                                  style: const TextStyle(color: _err, fontSize: 13, height: 1.4)),
                              ),
                            ],
                            
                            const SizedBox(height: 24),

                            // PREMIUM Badge or Trial Info
                            FutureBuilder<int>(
                              future: trialService.getRemainingDays(),
                              builder: (context, snapshot) {
                                final remaining = snapshot.data ?? 0;
                                final isPro = remaining > 10; // TrialService returns 999 for pro

                                if (isPro) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                                    decoration: BoxDecoration(
                                      gradient: const LinearGradient(
                                        colors: [Color(0xFFFFD700), Color(0xFFFFA500)],
                                      ),
                                      borderRadius: BorderRadius.circular(16),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFFFFD700).withOpacity(0.3),
                                          blurRadius: 20,
                                          spreadRadius: 2,
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.stars_rounded, color: Colors.black, size: 28),
                                        const SizedBox(width: 12),
                                        Text(
                                          'PREMIUM',
                                          style: GoogleFonts.nunito(
                                            color: Colors.black,
                                            fontSize: 22,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  );
                                }

                                return Container(
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF9D4EDD).withOpacity(0.05),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(color: const Color(0xFF9D4EDD).withOpacity(0.2)),
                                  ),
                                  child: Row(
                                    children: [
                                      const Icon(Icons.info_outline_rounded, color: Color(0xFFBB86FC), size: 20),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Text(
                                          lang.locale.value == 'fr' 
                                            ? 'Essai gratuit de 3 jours inclus. Activation Premium ensuite dès 0,99€.'
                                            : '3-day free trial included. Premium activation from 0.99€ afterwards.',
                                          style: GoogleFonts.nunito(
                                            color: const Color(0xFFB0AEC8),
                                            fontSize: 12,
                                            fontWeight: FontWeight.w600,
                                            height: 1.4,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                            ),

                            const SizedBox(height: 36),

                            // Submit button
                            SizedBox(
                              height: 54,
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _loading ? null : _submit,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: _accent,
                                  foregroundColor: _txt,
                                  disabledBackgroundColor: _accent.withOpacity(0.4),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                  elevation: 0,
                                ),
                                child: _loading
                                  ? const SizedBox(width: 24, height: 24,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                                  : Text(lang.t('setup_btn_check'),
                                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                              ),
                            ),
                            const SizedBox(height: 40),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 16,
                  right: 16,
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      _LangBtn(label: 'FR', active: lang.locale.value == 'fr', onTap: () { lang.setLanguage('fr'); }),
                      const SizedBox(width: 8),
                      _LangBtn(label: 'EN', active: lang.locale.value == 'en', onTap: () { lang.setLanguage('en'); }),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      }
    );
  }
}

class _LangBtn extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _LangBtn({required this.label, required this.active, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
    color: Colors.transparent,
    child: InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: active ? const Color(0xFF9D4EDD) : Colors.white.withOpacity(0.05),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: active ? const Color(0xFFBB86FC) : const Color(0x449D4EDD)),
        ),
        child: Text(label, style: TextStyle(color: active ? Colors.white : const Color(0xFFB0AEC8), fontWeight: FontWeight.bold, fontSize: 12)),
      ),
    ),
  );
}

class _Tab extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;
  const _Tab({required this.label, required this.active, required this.onTap});

  static const _accent = Color(0xFF9D4EDD);
  static const _glow   = Color(0xFFBB86FC);
  static const _txtSub = Color(0xFFB0AEC8);

  @override
  Widget build(BuildContext context) => Expanded(
    child: Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            color: active ? const Color(0x339D4EDD) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: active ? _accent : Colors.transparent),
          ),
          alignment: Alignment.center,
          child: Text(label, style: TextStyle(
            color: active ? _glow : _txtSub,
            fontSize: 13,
            fontWeight: active ? FontWeight.w800 : FontWeight.w500,
          )),
        ),
      ),
    ),
  );
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final String label;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final bool autofocus;
  final ValueChanged<String>? onSubmitted;

  const _Field({
    required this.ctrl, required this.hint, required this.label, required this.icon,
    this.obscure = false, this.suffix, this.autofocus = false, this.onSubmitted,
  });

  static const _bgCard = Color(0xFF1F1235);
  static const _accent = Color(0xFF9D4EDD);
  static const _txt    = Color(0xFFFFFFFF);
  static const _txtSub = Color(0xFFB0AEC8);
  static const _border = Color(0x449D4EDD);

  @override
  Widget build(BuildContext context) => TextField(
    controller: ctrl,
    obscureText: obscure,
    autofocus: autofocus,
    onSubmitted: onSubmitted,
    style: const TextStyle(color: _txt, fontSize: 14),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _txtSub, fontSize: 13),
      hintText: hint,
      hintStyle: TextStyle(color: _txtSub.withOpacity(0.3), fontSize: 12),
      prefixIcon: Icon(icon, color: _accent, size: 20),
      suffixIcon: suffix,
      filled: true,
      fillColor: _bgCard,
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _border)),
      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _border)),
      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: _accent, width: 2.0)),
    ),
  );
}
