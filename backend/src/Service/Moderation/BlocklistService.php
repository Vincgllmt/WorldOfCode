<?php

declare(strict_types=1);

namespace App\Service\Moderation;

use Symfony\Component\Yaml\Yaml;

/**
 * Modération par liste de mots interdits.
 *
 * Charge un fichier YAML et fournit un check rapide :
 *   - severe  → rejet automatique
 *   - warning → flag pour modération humaine
 *   - urls    → URL suspectes
 *
 * Le texte est normalisé (lowercase + sans accents + leet speak basique)
 * pour résister aux contournements du genre "n@zi" / "p3do" / "fdp".
 */
class BlocklistService
{
    /** @var array{severe: string[], warning: string[], urls: string[]} */
    private array $blocklist;

    public function __construct(string $blocklistPath)
    {
        if (!is_file($blocklistPath)) {
            throw new \RuntimeException("Blocklist file not found: $blocklistPath");
        }
        $data = Yaml::parseFile($blocklistPath);
        $this->blocklist = [
            'severe' => array_map([$this, 'normalize'], $data['severe'] ?? []),
            'warning' => array_map([$this, 'normalize'], $data['warning'] ?? []),
            'urls' => $data['urls'] ?? [],
        ];
    }

    /**
     * Vérifie un texte contre la blocklist.
     *
     * @return array{
     *     severe: string[],
     *     warning: string[],
     *     urls: string[]
     * } Les mots/URLs trouvés par catégorie.
     */
    public function check(string $text): array
    {
        $normalized = $this->normalize($text);

        $severe = [];
        foreach ($this->blocklist['severe'] as $word) {
            if ($this->containsAsWord($normalized, $word)) {
                $severe[] = $word;
            }
        }

        $warning = [];
        foreach ($this->blocklist['warning'] as $word) {
            if ($this->containsAsWord($normalized, $word)) {
                $warning[] = $word;
            }
        }

        $urls = [];
        foreach ($this->blocklist['urls'] as $url) {
            if (stripos($text, $url) !== false) {
                $urls[] = $url;
            }
        }

        return [
            'severe' => $severe,
            'warning' => $warning,
            'urls' => $urls,
        ];
    }

    /**
     * True si le texte contient au moins un mot de la catégorie "severe".
     */
    public function isSevere(string $text): bool
    {
        return $this->check($text)['severe'] !== [];
    }

    /**
     * Normalise une chaîne pour le matching :
     *  - minuscules
     *  - suppression des accents (Transliterator si dispo, sinon mapping manuel)
     *  - "leet speak" inverse (4→a, 3→e, 1→i, 0→o, 5→s, 7→t, @→a, $→s)
     *  - espaces multiples → simple espace
     */
    private function normalize(string $text): string
    {
        $text = mb_strtolower($text, 'UTF-8');

        // 1. Mapping manuel des caractères diacritiques courants.
        //    Plus déterministe que iconv (qui peut translittérer Ä en "AE"
        //    selon la locale système) et que Transliterator (qui peut
        //    ne pas être dispo si l'extension intl n'est pas activée).
        $text = strtr($text, [
            // a
            'à' => 'a', 'á' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a', 'å' => 'a', 'ā' => 'a', 'ă' => 'a', 'ą' => 'a',
            // c
            'ç' => 'c', 'ć' => 'c', 'č' => 'c',
            // e
            'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e', 'ē' => 'e', 'ė' => 'e', 'ę' => 'e',
            // i
            'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i', 'ī' => 'i', 'į' => 'i',
            // n
            'ñ' => 'n', 'ń' => 'n',
            // o
            'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o', 'ø' => 'o', 'ō' => 'o',
            // u
            'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u', 'ū' => 'u', 'ů' => 'u',
            // y
            'ý' => 'y', 'ÿ' => 'y',
            // autres
            'ß' => 'ss',
        ]);

        // 2. Filet de sécurité : si Transliterator est dispo (extension intl),
        //    on l'utilise pour gérer les caractères diacritiques restants.
        if (class_exists(\Transliterator::class)) {
            $tr = \Transliterator::create('Any-Latin; Latin-ASCII');
            if ($tr !== null) {
                $converted = $tr->transliterate($text);
                if (is_string($converted)) {
                    $text = $converted;
                }
            }
        }

        // 3. Leet speak inverse
        $text = strtr($text, [
            '4' => 'a', '@' => 'a',
            '3' => 'e',
            '1' => 'i', '!' => 'i',
            '0' => 'o',
            '5' => 's', '$' => 's',
            '7' => 't',
        ]);

        // 4. Compression des espaces
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return trim($text);
    }

    /**
     * Vrai si $word apparaît comme mot entier (avec frontières) dans $haystack normalisé.
     * Pour les expressions multi-mots, on fait un simple stripos.
     */
    private function containsAsWord(string $haystack, string $word): bool
    {
        if (str_contains($word, ' ')) {
            return stripos($haystack, $word) !== false;
        }
        $pattern = '/\b' . preg_quote($word, '/') . '\b/i';
        return (bool) preg_match($pattern, $haystack);
    }
}
