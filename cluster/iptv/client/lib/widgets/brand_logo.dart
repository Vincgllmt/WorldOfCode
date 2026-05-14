import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  final double fontSize;
  final bool showSubtitle;

  const BrandLogo({
    super.key,
    this.fontSize = 24,
    this.showSubtitle = true,
  });

  @override
  Widget build(BuildContext context) {
    const Color primaryAccent = Color(0xFFBB86FC); // Le violet clair/brillant
    const Color secondaryAccent = Color(0xFF9D4EDD); // Le violet plus profond

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: showSubtitle ? CrossAxisAlignment.center : CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Text(
              'J',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: primaryAccent, // Changé du blanc au violet brillant
                letterSpacing: -2,
                height: 1.0,
                shadows: [
                  Shadow(
                    color: primaryAccent.withValues(alpha: 0.3),
                    blurRadius: 12,
                  ),
                ],
              ),
            ),
            Image.asset(
              'assets/images/logo.png',
              height: fontSize * 1.3,
              width: fontSize * 1.1,
              fit: BoxFit.contain,
            ),
            Text(
              'GA',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: primaryAccent, // Changé du blanc au violet brillant
                letterSpacing: -2,
                height: 1.0,
                shadows: [
                  Shadow(
                    color: primaryAccent.withValues(alpha: 0.3),
                    blurRadius: 12,
                  ),
                ],
              ),
            ),
            SMap(width: fontSize * 0.3),
            SizedBox(width: fontSize * 0.3),
            Text(
              'BONITO',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: Colors.white, // Inversion : BONITO en blanc pour le contraste
                letterSpacing: -1,
                height: 1.0,
                shadows: const [
                  Shadow(
                    color: Colors.white24,
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
          ],
        ),
        if (showSubtitle) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [secondaryAccent.withValues(alpha: 0.2), Colors.transparent],
              ),
              borderRadius: BorderRadius.circular(4),
              border: Border.all(color: primaryAccent.withValues(alpha: 0.2)),
            ),
            child: Text(
              'IPTV PREMIUM SERVICE',
              style: TextStyle(
                fontSize: fontSize * 0.35,
                fontWeight: FontWeight.w600,
                color: primaryAccent.withValues(alpha: 0.9),
                letterSpacing: 5,
              ),
            ),
          ),
        ],
      ],
    );
  }
}

// Petit helper pour éviter l'erreur sur SMap si c'était une faute de frappe dans ma pensée
class SMap extends StatelessWidget {
  final double width;
  const SMap({super.key, required this.width});
  @override
  Widget build(BuildContext context) => SizedBox(width: width);
}
