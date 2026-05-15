import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/credentials_service.dart';
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

  bool _manualMode = false;
  bool _loading    = false;
  String? _error;

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

  Future<void> _submit() async {
    setState(() { _loading = true; _error = null; });

    Credentials? creds;

    if (_manualMode) {
      final host = _hostCtrl.text.trim();
      final user = _userCtrl.text.trim();
      final pass = _passCtrl.text.trim();
      if (host.isEmpty || user.isEmpty || pass.isEmpty) {
        setState(() { _loading = false; _error = 'Tous les champs sont requis.'; });
        return;
      }
      creds = Credentials(
        host: host.endsWith('/') ? host.substring(0, host.length - 1) : host,
        user: user,
        pass: pass,
      );
    } else {
      final raw = _urlCtrl.text.trim();
      if (raw.isEmpty) {
        setState(() { _loading = false; _error = 'Entrez votre lien M3U.'; });
        return;
      }
      creds = CredentialsService.parseUrl(raw);
      if (creds == null) {
        setState(() {
          _loading = false;
          _error = 'Lien invalide. Format attendu :\nhttp://host:port/get.php?username=X&password=Y';
        });
        return;
      }
    }

    try {
      final ok = await ApiService().validate(creds);
      if (!ok) {
        setState(() { _loading = false; _error = 'Identifiants incorrects ou serveur inaccessible.'; });
        return;
      }
      await CredentialsService.save(creds);
      ApiService.invalidateCache();
      if (!mounted) return;
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const MainScreen()),
      );
    } catch (e) {
      setState(() { _loading = false; _error = 'Erreur de connexion : $e'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 500),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Huge Logo
                  Image.asset(
                    'assets/images/logo.png',
                    height: 120,
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(height: 24),
                  
                  // Styled encadré for "JOGA BONITO IPTV"
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF9D4EDD).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFBB86FC).withValues(alpha: 0.3), width: 1.5),
                    ),
                    child: const Text(
                      'JOGA BONITO IPTV',
                      style: TextStyle(
                        color: Color(0xFFBB86FC),
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 4,
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 48),
                  const Text(
                    'Entrez votre abonnement IPTV pour accéder à votre catalogue.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: _txtSub, fontSize: 14, height: 1.5),
                  ),
                  const SizedBox(height: 36),

                  // Mode toggle
                  Container(
                    height: 46,
                    decoration: BoxDecoration(
                      color: _bgCard,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: _border),
                    ),
                    child: Row(children: [
                      _Tab(label: 'Lien M3U', active: !_manualMode,
                        onTap: () => setState(() { _manualMode = false; _error = null; })),
                      _Tab(label: 'Manuel',   active: _manualMode,
                        onTap: () => setState(() { _manualMode = true;  _error = null; })),
                    ]),
                  ),
                  const SizedBox(height: 24),

                  // Fields
                  if (!_manualMode) ...[
                    _Field(
                      ctrl: _urlCtrl,
                      hint: 'http://host:port/get.php?username=X&password=Y',
                      label: 'Lien M3U',
                      icon: Icons.link_rounded,
                      onSubmitted: (_) => _submit(),
                    ),
                  ] else ...[
                    _Field(
                      ctrl: _hostCtrl,
                      hint: 'http://host:port',
                      label: 'Serveur',
                      icon: Icons.dns_rounded,
                    ),
                    const SizedBox(height: 14),
                    _Field(
                      ctrl: _userCtrl,
                      hint: 'Identifiant',
                      label: 'Utilisateur',
                      icon: Icons.person_rounded,
                    ),
                    const SizedBox(height: 14),
                    _Field(
                      ctrl: _passCtrl,
                      hint: 'Mot de passe',
                      label: 'Mot de passe',
                      icon: Icons.lock_rounded,
                      obscure: !_passVisible,
                      suffix: IconButton(
                        onPressed: () => setState(() => _passVisible = !_passVisible),
                        icon: Icon(
                          _passVisible ? Icons.visibility_off_rounded : Icons.visibility_rounded,
                          color: _txtSub, size: 18,
                        ),
                      ),
                      onSubmitted: (_) => _submit(),
                    ),
                  ],

                  // Collez le lien info
                  if (!_manualMode) ...[
                    const SizedBox(height: 10),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        '  Collez le lien fourni par votre opérateur IPTV.',
                        style: TextStyle(color: _txtSub.withValues(alpha: 0.6), fontSize: 11),
                      ),
                    ),
                  ],

                  // Error
                  if (_error != null) ...[
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: _err.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: _err.withValues(alpha: 0.4)),
                      ),
                      child: Text(_error!,
                        style: const TextStyle(color: _err, fontSize: 13, height: 1.4)),
                    ),
                  ],

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
                        disabledBackgroundColor: _accent.withValues(alpha: 0.4),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        elevation: 0,
                      ),
                      child: _loading
                        ? const SizedBox(width: 24, height: 24,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                        : const Text('Vérifier et continuer',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5)),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
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
    child: GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
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
  );
}

class _Field extends StatelessWidget {
  final TextEditingController ctrl;
  final String hint;
  final String label;
  final IconData icon;
  final bool obscure;
  final Widget? suffix;
  final ValueChanged<String>? onSubmitted;

  const _Field({
    required this.ctrl, required this.hint, required this.label, required this.icon,
    this.obscure = false, this.suffix, this.onSubmitted,
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
    onSubmitted: onSubmitted,
    style: const TextStyle(color: _txt, fontSize: 14),
    decoration: InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _txtSub, fontSize: 13),
      hintText: hint,
      hintStyle: TextStyle(color: _txtSub.withValues(alpha: 0.3), fontSize: 12),
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
