import 'dart:convert';

String normalize(String s) => s.toLowerCase()
  .replaceAll(RegExp(r'[àáâãäå]'), 'a')
  .replaceAll(RegExp(r'[èéêë]'), 'e')
  .replaceAll(RegExp(r'[ìíîï]'), 'i')
  .replaceAll(RegExp(r'[òóôõöø]'), 'o')
  .replaceAll(RegExp(r'[ùúûü]'), 'u')
  .replaceAll(RegExp(r'[ýÿ]'), 'y')
  .replaceAll('ñ', 'n')
  .replaceAll('ç', 'c')
  .replaceAll('œ', 'oe')
  .replaceAll('æ', 'ae');

String decodeIfNeeded(String s) {
  if (s.isEmpty) return s;
  
  // If it contains spaces, it's likely not a single base64 block
  // but it could be multiple words encoded. However, usually it's one block.
  // In the user's image, it seems to be one block.
  if (s.contains(' ')) {
    // Some providers might encode words separately? Unlikely but let's check.
    return s;
  }

  // Base64 regex: A-Z, a-z, 0-9, +, /, and = for padding
  final base64Regex = RegExp(r'^[a-zA-Z0-9+/]*={0,2}$');
  if (!base64Regex.hasMatch(s)) return s;
  
  // Length check: too short might be false positive (e.g. "Direct")
  if (s.length < 8) return s;

  try {
    String toDecode = s;
    // Add missing padding
    while (toDecode.length % 4 != 0) {
      toDecode += '=';
    }
    
    final bytes = base64.decode(toDecode);
    
    // Attempt UTF-8
    try {
      final decoded = utf8.decode(bytes);
      // If it's a bunch of gibberish, maybe it wasn't base64 or it's binary
      // Simple heuristic: if it has lots of non-printable characters, it's probably not text
      if (decoded.contains('\u0000')) return s;
      return decoded;
    } catch (_) {
      // Fallback to Latin-1
      return latin1.decode(bytes);
    }
  } catch (_) {
    return s;
  }
}
