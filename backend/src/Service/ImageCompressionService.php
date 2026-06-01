<?php

namespace App\Service;

/**
 * Service d'optimisation d'images :
 * - Redimensionne les images dont la plus grande dimension dépasse MAX_DIMENSION
 * - Convertit en WebP avec une qualité de WEBP_QUALITY
 * - Conserve les GIFs animés tels quels (l'animation serait perdue sinon)
 * - Applique l'orientation EXIF pour les JPEG
 */
class ImageCompressionService
{
    public const MAX_DIMENSION = 1920;
    public const WEBP_QUALITY = 85;

    /**
     * MIME types pris en charge par la compression.
     */
    private const PROCESSABLE_MIMES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ];

    /**
     * Traite une image : redimensionne si nécessaire et convertit en WebP.
     *
     * @return array{path: string, mime: string} Chemin du fichier (compressé ou original) et son MIME final.
     *                                            Le fichier compressé est créé dans le répertoire temporaire.
     */
    public function process(string $localPath, string $mime): array
    {
        // 1. Cas où on ne traite pas l'image (format non géré, GIF animé, GD absent)
        if (!$this->shouldProcess($localPath, $mime)) {
            return ['path' => $localPath, 'mime' => $mime];
        }

        // 2. Chargement de l'image
        $image = $this->loadImage($localPath, $mime);
        if ($image === null) {
            return ['path' => $localPath, 'mime' => $mime];
        }

        try {
            // 3. Application de l'orientation EXIF (JPEG uniquement)
            if ($mime === 'image/jpeg') {
                $image = $this->applyExifOrientation($image, $localPath);
            }

            // 4. Redimensionnement si nécessaire
            $image = $this->resizeIfNeeded($image);

            // 5. Sauvegarde au format WebP
            $webpPath = $this->saveAsWebP($image);

            // 6. Si la version WebP est plus lourde que l'original (rare mais possible
            //    pour de petites images déjà compressées), on garde l'original.
            if (filesize($webpPath) >= filesize($localPath)) {
                @unlink($webpPath);
                return ['path' => $localPath, 'mime' => $mime];
            }

            return ['path' => $webpPath, 'mime' => 'image/webp'];
        } finally {
            if (is_resource($image) || $image instanceof \GdImage) {
                imagedestroy($image);
            }
        }
    }

    /**
     * Détermine si une image doit être traitée.
     */
    private function shouldProcess(string $localPath, string $mime): bool
    {
        // Extension GD requise
        // @codeCoverageIgnoreStart
        if (!extension_loaded('gd')) {
            return false;
        }
        // @codeCoverageIgnoreEnd

        if (!in_array($mime, self::PROCESSABLE_MIMES, true)) {
            return false;
        }

        if (!is_readable($localPath)) {
            return false;
        }

        // GIF animé : on préserve l'animation
        if ($mime === 'image/gif' && $this->isAnimatedGif($localPath)) {
            return false;
        }

        return true;
    }

    /**
     * Détecte un GIF animé en cherchant plusieurs blocs de graphic control.
     */
    private function isAnimatedGif(string $path): bool
    {
        $fh = @fopen($path, 'rb');
        if ($fh === false) {
            return false;
        }

        try {
            $count = 0;
            // On lit le fichier par chunks et on cherche le pattern 0x00 0x21 0xF9 0x04
            // qui indique le début d'un Graphic Control Extension.
            $previous = '';
            while (!feof($fh) && $count < 2) {
                $chunk = $previous . fread($fh, 1024 * 100);
                $count += substr_count($chunk, "\x00\x21\xF9\x04");
                // Conserver la fin du chunk pour ne pas rater un pattern à cheval
                $previous = substr($chunk, -3);
            }
            return $count > 1;
        } finally {
            fclose($fh);
        }
    }

    /**
     * Charge une image depuis le disque selon son MIME.
     */
    private function loadImage(string $path, string $mime): ?\GdImage
    {
        $image = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png'  => @imagecreatefrompng($path),
            'image/gif'  => @imagecreatefromgif($path),
            'image/webp' => @imagecreatefromwebp($path),
            default      => false,
        };

        return $image instanceof \GdImage ? $image : null;
    }

    /**
     * Applique l'orientation EXIF (rotation/miroir) pour les JPEG.
     */
    private function applyExifOrientation(\GdImage $image, string $path): \GdImage
    {
        // @codeCoverageIgnoreStart
        if (!function_exists('exif_read_data')) {
            return $image;
        }
        // @codeCoverageIgnoreEnd

        $exif = @exif_read_data($path);
        if ($exif === false || !isset($exif['Orientation'])) {
            return $image;
        }

        $orientation = (int) $exif['Orientation'];
        switch ($orientation) {
            case 2:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                break;
            case 3:
                $image = imagerotate($image, 180, 0);
                break;
            case 4:
                imageflip($image, IMG_FLIP_VERTICAL);
                break;
            case 5:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = imagerotate($image, -90, 0);
                break;
            case 6:
                $image = imagerotate($image, -90, 0);
                break;
            case 7:
                imageflip($image, IMG_FLIP_HORIZONTAL);
                $image = imagerotate($image, 90, 0);
                break;
            case 8:
                $image = imagerotate($image, 90, 0);
                break;
        }

        return $image;
    }

    /**
     * Redimensionne l'image si sa plus grande dimension dépasse MAX_DIMENSION.
     */
    private function resizeIfNeeded(\GdImage $image): \GdImage
    {
        $width  = imagesx($image);
        $height = imagesy($image);
        $max    = max($width, $height);

        if ($max <= self::MAX_DIMENSION) {
            return $image;
        }

        $ratio     = self::MAX_DIMENSION / $max;
        $newWidth  = (int) round($width * $ratio);
        $newHeight = (int) round($height * $ratio);

        $resized = imagecreatetruecolor($newWidth, $newHeight);

        // Préserver la transparence (PNG / WebP / GIF)
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        $transparent = imagecolorallocatealpha($resized, 0, 0, 0, 127);
        imagefilledrectangle($resized, 0, 0, $newWidth, $newHeight, $transparent);

        imagecopyresampled(
            $resized,
            $image,
            0, 0, 0, 0,
            $newWidth, $newHeight,
            $width, $height
        );

        imagedestroy($image);
        return $resized;
    }

    /**
     * Sauvegarde l'image au format WebP dans un fichier temporaire.
     * Le caller est responsable de supprimer le fichier après usage.
     *
     * Protected pour permettre l'override dans les tests (force un WebP plus
     * lourd que l'original pour couvrir la branche "garder l'original").
     */
    protected function saveAsWebP(\GdImage $image): string
    {
        // @codeCoverageIgnoreStart
        $tmpPath = tempnam(sys_get_temp_dir(), 'webp_') ?: (sys_get_temp_dir() . '/webp_' . uniqid());
        // @codeCoverageIgnoreEnd

        // Préserver la transparence à la sauvegarde
        imagepalettetotruecolor($image);
        imagealphablending($image, true);
        imagesavealpha($image, true);

        imagewebp($image, $tmpPath, self::WEBP_QUALITY);

        return $tmpPath;
    }
}
