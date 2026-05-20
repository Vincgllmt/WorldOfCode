import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../main.dart';
import '../services/language_service.dart';
import '../services/credentials_service.dart';

class PurchaseScreen extends StatefulWidget {
  const PurchaseScreen({super.key});

  @override
  State<PurchaseScreen> createState() => _PurchaseScreenState();
}

class _PurchaseScreenState extends State<PurchaseScreen> {
  bool _isPurchasing = false;

  Future<void> _handlePurchase(String type) async {
    setState(() => _isPurchasing = true);
    
    // Simulation de l'achat (In-App Purchase)
    await Future.delayed(const Duration(seconds: 2));
    
    String message = "";
    if (type == 'monthly') {
      await trialService.activateSubscription(const Duration(days: 30));
      message = lang.t('success_monthly');
    } else if (type == 'yearly') {
      await trialService.activateSubscription(const Duration(days: 365));
      message = lang.t('success_yearly');
    } else {
      await trialService.setPro();
      message = lang.t('success_lifetime');
    }

    final hasCredentials = await CredentialsService.load() != null;
    
    if (mounted) {
      setState(() => _isPurchasing = false);
      
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => Dialog(
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: const Color(0xFF1F1235),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFBB86FC), width: 2),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF9D4EDD).withOpacity(0.5),
                  blurRadius: 40,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.green,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.check_rounded, color: Colors.white, size: 48),
                ),
                const SizedBox(height: 24),
                Text(
                  lang.t('activated_title'),
                  style: GoogleFonts.nunito(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    color: Colors.white,
                    letterSpacing: 2,
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white70, fontSize: 15, height: 1.5),
                ),
                const SizedBox(height: 32),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      if (hasCredentials) {
                        Navigator.of(context).pushNamedAndRemoveUntil('/main', (route) => false);
                      } else {
                        Navigator.of(context).pushNamedAndRemoveUntil('/setup', (route) => false);
                      }
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFBB86FC),
                      foregroundColor: const Color(0xFF1A0F2E),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(lang.t('lets_go'), style: const TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0C0714),
      body: Stack(
        children: [
          // Gradient Background
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0, -0.5),
                radius: 1.2,
                colors: [Color(0xFF2D1B4E), Color(0xFF0C0714)],
              ),
            ),
          ),
          
          SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  const Icon(Icons.star_rounded, color: Color(0xFFFFD700), size: 64),
                  const SizedBox(height: 16),
                  Text(
                    lang.t('premium_title'),
                    style: GoogleFonts.nunito(
                      fontSize: 28,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    lang.t('premium_subtitle'),
                    textAlign: TextAlign.center,
                    style: GoogleFonts.nunito(color: Colors.white70, fontSize: 16),
                  ),
                  const SizedBox(height: 40),
                  
                  // Monthly
                  _PriceCard(
                    title: lang.t('plan_monthly'),
                    price: lang.t('price_monthly'),
                    period: lang.t('period_monthly'),
                    onTap: () => _handlePurchase('monthly'),
                    isLoading: _isPurchasing,
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Yearly
                  _PriceCard(
                    title: lang.t('plan_yearly'),
                    price: lang.t('price_yearly'),
                    period: lang.t('period_yearly'),
                    badge: lang.t('save_percent'),
                    isPopular: false,
                    onTap: () => _handlePurchase('yearly'),
                    isLoading: _isPurchasing,
                  ),
                  
                  const SizedBox(height: 16),
                  
                  // Lifetime (The HERO)
                  _PriceCard(
                    title: lang.t('plan_lifetime'),
                    price: lang.t('price_lifetime'),
                    period: lang.t('period_lifetime'),
                    badge: lang.t('limited_offer'),
                    isHero: true,
                    onTap: () => _handlePurchase('lifetime'),
                    isLoading: _isPurchasing,
                  ),
                  
                  const SizedBox(height: 60),
                  
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: Text(
                      lang.t('later'),
                      style: TextStyle(color: Colors.white.withOpacity(0.3), decoration: TextDecoration.underline),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),
          
          if (_isPurchasing)
            Container(
              color: Colors.black.withOpacity(0.7),
              child: const Center(child: CircularProgressIndicator(color: Color(0xFFBB86FC))),
            ),
        ],
      ),
    );
  }
}

class _PriceCard extends StatelessWidget {
  final String title;
  final String price;
  final String period;
  final String? badge;
  final bool isHero;
  final bool isPopular;
  final VoidCallback onTap;
  final bool isLoading;

  const _PriceCard({
    required this.title,
    required this.price,
    required this.period,
    this.badge,
    this.isHero = false,
    this.isPopular = false,
    required this.onTap,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: isHero ? const Color(0xFF9D4EDD).withOpacity(0.15) : const Color(0xFF1F1235),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isHero ? const Color(0xFFFFD700) : (isPopular ? const Color(0xFFBB86FC) : Colors.white.withOpacity(0.1)),
            width: isHero ? 2.5 : 1.5,
          ),
          boxShadow: isHero ? [
            BoxShadow(color: const Color(0xFFFFD700).withOpacity(0.1), blurRadius: 20, spreadRadius: 2)
          ] : [],
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (badge != null)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      margin: const EdgeInsets.only(bottom: 8),
                      decoration: BoxDecoration(
                        color: isHero ? const Color(0xFFFFD700) : const Color(0xFFBB86FC),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        badge!,
                        style: TextStyle(color: isHero ? Colors.black : Colors.white, fontSize: 10, fontWeight: FontWeight.w900),
                      ),
                    ),
                  Text(
                    title,
                    style: GoogleFonts.nunito(
                      color: isHero ? const Color(0xFFFFD700) : Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  price,
                  style: GoogleFonts.nunito(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                Text(
                  period,
                  style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Icon(Icons.chevron_right_rounded, color: isHero ? const Color(0xFFFFD700) : Colors.white24),
          ],
        ),
      ),
    );
  }
}

class _BenefitItem extends StatelessWidget {
  final IconData icon;
  final String text;
  const _BenefitItem({required this.icon, required this.text});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        children: [
          Icon(icon, color: const Color(0xFFBB86FC), size: 20),
          const SizedBox(width: 12),
          Text(text, style: const TextStyle(color: Colors.white70, fontSize: 14)),
        ],
      ),
    );
  }
}
