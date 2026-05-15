import 'package:flutter/material.dart';

class BrandLogo extends StatelessWidget {
  final double fontSize;
  final bool showSubtitle;
  final bool centered;

  const BrandLogo({
    super.key,
    this.fontSize = 24,
    this.showSubtitle = true,
    this.centered = true,
  });

  @override
  Widget build(BuildContext context) {
    const Color primaryAccent = Color(0xFFBB86FC); 
    const Color secondaryAccent = Color(0xFF9D4EDD);

    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: centered ? CrossAxisAlignment.center : CrossAxisAlignment.start,
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
                color: primaryAccent,
                letterSpacing: -2,
                height: 1.0,
                shadows: [
                  Shadow(color: primaryAccent.withValues(alpha: 0.3), blurRadius: 12),
                ],
              ),
            ),
            Image.asset(
              'assets/images/logo.png',
              height: fontSize * 1.2,
              width: fontSize * 1.0,
              fit: BoxFit.contain,
            ),
            Text(
              'GA',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: primaryAccent,
                letterSpacing: -2,
                height: 1.0,
                shadows: [
                  Shadow(color: primaryAccent.withValues(alpha: 0.3), blurRadius: 12),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Text(
              'BONITO',
              style: TextStyle(
                fontSize: fontSize,
                fontWeight: FontWeight.w900,
                color: Colors.white,
                letterSpacing: -1,
                height: 1.0,
                shadows: const [
                  Shadow(color: Colors.white24, blurRadius: 8),
                ],
              ),
            ),
          ],
        ),
        if (showSubtitle) ...[
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
            decoration: BoxDecoration(
              color: const Color(0xFF160B25),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: primaryAccent.withValues(alpha: 0.4), width: 1.5),
              boxShadow: [
                BoxShadow(
                  color: primaryAccent.withValues(alpha: 0.15),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Text(
              'IPTV PREMIUM SERVICE',
              style: TextStyle(
                fontSize: fontSize * 0.25,
                fontWeight: FontWeight.w800,
                color: primaryAccent,
                letterSpacing: 4,
              ),
            ),
          ),
        ],
      ],
    );
  }
}
