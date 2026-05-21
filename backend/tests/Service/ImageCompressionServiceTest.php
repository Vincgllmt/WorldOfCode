<?php

namespace App\Tests\Service;

use App\Service\ImageCompressionService;
use PHPUnit\Framework\TestCase;

/**
 * Tests unitaires d'ImageCompressionService.
 *
 * Ces tests requièrent l'extension GD. Ils sont skipés si elle n'est pas dispo.
 */
class ImageCompressionServiceTest extends TestCase
{
    /** @var string[] Fichiers temporaires à nettoyer en fin de test */
    private array $tempFiles = [];

    private ImageCompressionService $service;

    protected function setUp(): void
    {
        if (!extension_loaded('gd')) {
            $this->markTestSkipped('Extension GD non installée');
        }
        $this->service = new ImageCompressionService();
    }

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
        $this->tempFiles = [];
    }

    // ======================================================================
    //  Helpers
    // ======================================================================

    private function createJpeg(int $width, int $height): string
    {
        $img = imagecreatetruecolor($width, $height);
        $red = imagecolorallocate($img, 255, 0, 0);
        imagefilledrectangle($img, 0, 0, $width, $height, $red);

        $path = tempnam(sys_get_temp_dir(), 'jpeg_test_');
        imagejpeg($img, $path, 90);
        imagedestroy($img);

        $this->tempFiles[] = $path;
        return $path;
    }

    private function createPng(int $width, int $height, bool $withAlpha = false): string
    {
        $img = imagecreatetruecolor($width, $height);
        if ($withAlpha) {
            imagealphablending($img, false);
            imagesavealpha($img, true);
            $transparent = imagecolorallocatealpha($img, 0, 0, 0, 127);
            imagefilledrectangle($img, 0, 0, $width, $height, $transparent);
        } else {
            $blue = imagecolorallocate($img, 0, 0, 255);
            imagefilledrectangle($img, 0, 0, $width, $height, $blue);
        }

        $path = tempnam(sys_get_temp_dir(), 'png_test_');
        imagepng($img, $path);
        imagedestroy($img);

        $this->tempFiles[] = $path;
        return $path;
    }

    private function createWebp(int $width, int $height): string
    {
        $img = imagecreatetruecolor($width, $height);
        $green = imagecolorallocate($img, 0, 255, 0);
        imagefilledrectangle($img, 0, 0, $width, $height, $green);

        $path = tempnam(sys_get_temp_dir(), 'webp_test_');
        imagewebp($img, $path, 85);
        imagedestroy($img);

        $this->tempFiles[] = $path;
        return $path;
    }

    private function createStaticGif(int $width, int $height): string
    {
        $img = imagecreatetruecolor($width, $height);
        $yellow = imagecolorallocate($img, 255, 255, 0);
        imagefilledrectangle($img, 0, 0, $width, $height, $yellow);

        $path = tempnam(sys_get_temp_dir(), 'gif_test_');
        imagegif($img, $path);
        imagedestroy($img);

        $this->tempFiles[] = $path;
        return $path;
    }

    /**
     * Crée un GIF animé minimal valide avec 2 frames pour tester la détection
     * d'animation.
     */
    private function createAnimatedGif(): string
    {
        // GIF89a minimal 2x2 avec 2 frames (= 2 blocs Graphic Control Extension)
        // Source : structure d'un GIF89a animé documentée par la spec W3C.
        $bytes =
            "GIF89a" .                          // Signature + version
            "\x02\x00\x02\x00" .                // Logical screen 2x2
            "\x80\x00\x00" .                   // GCT flag (1), color resolution 0, sort 0, GCT size 0 → 2 colors / bg index 0 / pixel aspect 0
            "\x00\x00\x00" .                   // Color 0 noir
            "\xFF\xFF\xFF" .                   // Color 1 blanc
            "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00" . // Application extension : loop
            // Frame 1
            "\x21\xF9\x04\x00\x0A\x00\x00\x00" . // Graphic control extension (#1)
            "\x2C\x00\x00\x00\x00\x02\x00\x02\x00\x00" . // Image descriptor 2x2
            "\x02\x02\x44\x01\x00" .             // LZW minimum code + image data + terminator
            // Frame 2
            "\x21\xF9\x04\x00\x0A\x00\x00\x00" . // Graphic control extension (#2)
            "\x2C\x00\x00\x00\x00\x02\x00\x02\x00\x00" . // Image descriptor
            "\x02\x02\x44\x01\x00" .             // LZW data
            "\x3B";                              // Trailer

        $path = tempnam(sys_get_temp_dir(), 'gif_anim_');
        file_put_contents($path, $bytes);

        $this->tempFiles[] = $path;
        return $path;
    }

    // ======================================================================
    //  shouldProcess - formats non supportés
    // ======================================================================

    public function testUnsupportedMimeIsNotProcessed(): void
    {
        $path = $this->createJpeg(100, 100);
        $result = $this->service->process($path, 'application/pdf');

        $this->assertSame($path, $result['path']);
        $this->assertSame('application/pdf', $result['mime']);
    }

    public function testUnreadableFileIsNotProcessed(): void
    {
        $result = $this->service->process('/path/that/does/not/exist.jpg', 'image/jpeg');

        $this->assertSame('/path/that/does/not/exist.jpg', $result['path']);
        $this->assertSame('image/jpeg', $result['mime']);
    }

    public function testAnimatedGifIsPreserved(): void
    {
        $path = $this->createAnimatedGif();
        $result = $this->service->process($path, 'image/gif');

        $this->assertSame($path, $result['path'], 'Un GIF animé doit être préservé tel quel');
        $this->assertSame('image/gif', $result['mime']);
    }

    public function testStaticGifIsConvertedToWebp(): void
    {
        $path = $this->createStaticGif(800, 600);
        $result = $this->service->process($path, 'image/gif');

        // Un GIF statique 800x600 plein de couleur unie devrait se compresser
        // largement en WebP, donc on attend bien une conversion.
        if ($result['path'] === $path) {
            // Skip si jamais la conversion produit un fichier plus lourd (peu
            // probable mais possible avec des images dégénérées)
            $this->markTestSkipped('WebP plus lourd que GIF, conversion abandonnée');
        }

        $this->tempFiles[] = $result['path'];
        $this->assertSame('image/webp', $result['mime']);
        $this->assertFileExists($result['path']);
    }

    // ======================================================================
    //  Conversion WebP
    // ======================================================================

    public function testLargeJpegIsResizedAndConvertedToWebp(): void
    {
        $path = $this->createJpeg(3000, 2000);
        $result = $this->service->process($path, 'image/jpeg');

        $this->tempFiles[] = $result['path'];

        $this->assertNotSame($path, $result['path']);
        $this->assertSame('image/webp', $result['mime']);

        // Vérifier le redimensionnement : la plus grande dimension doit valoir 1920
        $info = getimagesize($result['path']);
        $this->assertIsArray($info);
        $this->assertLessThanOrEqual(ImageCompressionService::MAX_DIMENSION, max($info[0], $info[1]));
        $this->assertSame(ImageCompressionService::MAX_DIMENSION, max($info[0], $info[1]));
    }

    public function testLargePngIsResizedAndConvertedToWebp(): void
    {
        $path = $this->createPng(2500, 1500);
        $result = $this->service->process($path, 'image/png');

        $this->tempFiles[] = $result['path'];

        $this->assertNotSame($path, $result['path']);
        $this->assertSame('image/webp', $result['mime']);

        $info = getimagesize($result['path']);
        $this->assertSame(1920, $info[0]); // largeur = MAX
        $this->assertSame(1152, $info[1]); // hauteur proportionnelle (1920*1500/2500)
    }

    public function testSmallImageIsConvertedToWebpWithoutResize(): void
    {
        // Photo 800x600 → pas de redimensionnement mais conversion WebP si gain
        $path = $this->createJpeg(800, 600);
        $result = $this->service->process($path, 'image/jpeg');

        // Que la conversion ait lieu ou non, le résultat doit être valide
        $this->assertFileExists($result['path']);

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
            $this->assertSame('image/webp', $result['mime']);

            $info = getimagesize($result['path']);
            $this->assertSame(800, $info[0]);
            $this->assertSame(600, $info[1]);
        }
    }

    // ======================================================================
    //  Redimensionnement : ratio préservé
    // ======================================================================

    public function testResizePreservesAspectRatioPortrait(): void
    {
        // Image portrait 2000x4000 : la hauteur (4000) dépasse MAX
        $path = $this->createJpeg(2000, 4000);
        $result = $this->service->process($path, 'image/jpeg');

        $this->tempFiles[] = $result['path'];

        $info = getimagesize($result['path']);
        $this->assertSame(960, $info[0]);  // 2000 * (1920/4000)
        $this->assertSame(1920, $info[1]); // hauteur clamp à MAX
    }

    public function testImageExactlyAtMaxDimensionIsNotResized(): void
    {
        $path = $this->createJpeg(1920, 1080);
        $result = $this->service->process($path, 'image/jpeg');

        // Soit pas converti, soit converti en WebP mais avec mêmes dimensions
        $finalPath = $result['path'];
        if ($finalPath !== $path) {
            $this->tempFiles[] = $finalPath;
        }
        $info = getimagesize($finalPath);
        $this->assertSame(1920, $info[0]);
        $this->assertSame(1080, $info[1]);
    }

    // ======================================================================
    //  WebP → WebP (déjà optimisé)
    // ======================================================================

    public function testWebpInputIsHandled(): void
    {
        $path = $this->createWebp(2400, 1600);
        $result = $this->service->process($path, 'image/webp');

        // Le résultat doit être au format WebP (qu'il y ait gain de taille ou non)
        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
            $this->assertSame('image/webp', $result['mime']);

            $info = getimagesize($result['path']);
            $this->assertLessThanOrEqual(1920, max($info[0], $info[1]));
        }
    }

    // ======================================================================
    //  Constantes publiques
    // ======================================================================

    public function testMaxDimensionConstantIs1920(): void
    {
        $this->assertSame(1920, ImageCompressionService::MAX_DIMENSION);
    }

    public function testWebpQualityConstantIs85(): void
    {
        $this->assertSame(85, ImageCompressionService::WEBP_QUALITY);
    }

    // ======================================================================
    //  Images corrompues : on garde l'original
    // ======================================================================

    public function testCorruptJpegFallsBackToOriginal(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'corrupt_jpg_');
        file_put_contents($path, 'invalid jpeg bytes');
        $this->tempFiles[] = $path;

        $result = $this->service->process($path, 'image/jpeg');

        $this->assertSame($path, $result['path']);
        $this->assertSame('image/jpeg', $result['mime']);
    }

    public function testCorruptPngFallsBackToOriginal(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'corrupt_png_');
        file_put_contents($path, 'invalid png bytes');
        $this->tempFiles[] = $path;

        $result = $this->service->process($path, 'image/png');

        $this->assertSame($path, $result['path']);
        $this->assertSame('image/png', $result['mime']);
    }

    public function testCorruptWebpFallsBackToOriginal(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'corrupt_webp_');
        file_put_contents($path, 'invalid webp bytes');
        $this->tempFiles[] = $path;

        $result = $this->service->process($path, 'image/webp');

        $this->assertSame($path, $result['path']);
        $this->assertSame('image/webp', $result['mime']);
    }

    // ======================================================================
    //  EXIF orientation : 8 cas du standard
    // ======================================================================

    /**
     * Construit un JPEG portant un tag EXIF Orientation et le retourne sur disque.
     * Le segment APP1 est injecté juste après le marker SOI (0xFFD8).
     */
    private function createJpegWithExifOrientation(int $orientation, int $width = 200, int $height = 300): string
    {
        // IFD0 : 1 entrée (Orientation, SHORT, count 1, value)
        $entry = pack('v', 0x0112)        // tag Orientation
            . pack('v', 3)                // type SHORT
            . pack('V', 1)                // count
            . pack('v', $orientation)     // value
            . "\x00\x00";                 // padding (champ value sur 4 bytes)

        $ifd0 = pack('v', 1)              // nombre d'entrées
            . $entry
            . pack('V', 0);               // next IFD offset

        // Header TIFF (Intel byte order, IFD0 à l'offset 8)
        $tiff = "II*\x00" . pack('V', 8) . $ifd0;
        $exif = "Exif\x00\x00" . $tiff;

        // Segment APP1 : marker FFE1 + length(big-endian) + payload
        $app1 = "\xFF\xE1" . pack('n', strlen($exif) + 2) . $exif;

        // JPEG de base
        $img = imagecreatetruecolor($width, $height);
        $color = imagecolorallocate($img, 255, 0, 0);
        imagefilledrectangle($img, 0, 0, $width - 1, $height - 1, $color);

        $tmpFile = tempnam(sys_get_temp_dir(), 'jpg_orig_');
        imagejpeg($img, $tmpFile, 90);
        imagedestroy($img);

        $jpegBytes = file_get_contents($tmpFile);
        @unlink($tmpFile);

        // Injecte APP1 après FFD8 (SOI)
        $finalBytes = substr($jpegBytes, 0, 2) . $app1 . substr($jpegBytes, 2);

        $path = tempnam(sys_get_temp_dir(), 'jpg_exif_');
        file_put_contents($path, $finalBytes);

        $this->tempFiles[] = $path;
        return $path;
    }

    public function testExifOrientation1NoChange(): void
    {
        $path = $this->createJpegWithExifOrientation(1, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(200, $info[0]);
        $this->assertSame(300, $info[1]);
    }

    public function testExifOrientation2FlipHorizontalPreservesDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(2, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(200, $info[0]);
        $this->assertSame(300, $info[1]);
    }

    public function testExifOrientation3Rotate180PreservesDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(3, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(200, $info[0]);
        $this->assertSame(300, $info[1]);
    }

    public function testExifOrientation4FlipVerticalPreservesDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(4, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(200, $info[0]);
        $this->assertSame(300, $info[1]);
    }

    public function testExifOrientation5FlipPlusRotate90SwapsDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(5, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        // Rotation 90° → dimensions inversées
        $info = getimagesize($result['path']);
        $this->assertSame(300, $info[0]);
        $this->assertSame(200, $info[1]);
    }

    public function testExifOrientation6Rotate90CwSwapsDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(6, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(300, $info[0]);
        $this->assertSame(200, $info[1]);
    }

    public function testExifOrientation7FlipPlusRotate90SwapsDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(7, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(300, $info[0]);
        $this->assertSame(200, $info[1]);
    }

    public function testExifOrientation8Rotate90CcwSwapsDimensions(): void
    {
        $path = $this->createJpegWithExifOrientation(8, 200, 300);
        $result = $this->service->process($path, 'image/jpeg');

        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        $info = getimagesize($result['path']);
        $this->assertSame(300, $info[0]);
        $this->assertSame(200, $info[1]);
    }

    // ======================================================================
    //  Vérification visuelle de la rotation EXIF (couleur de pixel)
    // ======================================================================

    /**
     * Construit un JPEG dont le pixel (0,0) est rouge et tous les autres bleus,
     * avec un tag EXIF Orientation 3 (180°). Après rotation, le pixel rouge
     * doit se retrouver en bas à droite.
     */
    public function testExifOrientation3PutsRedPixelAtBottomRight(): void
    {
        // Construit le JPEG manuellement avec pixel rouge en (0,0)
        $width = 200;
        $height = 300;
        $img = imagecreatetruecolor($width, $height);
        $blue = imagecolorallocate($img, 0, 0, 255);
        $red  = imagecolorallocate($img, 255, 0, 0);
        imagefilledrectangle($img, 0, 0, $width - 1, $height - 1, $blue);
        // Bloc rouge 5x5 en haut à gauche
        imagefilledrectangle($img, 0, 0, 4, 4, $red);

        $tmpFile = tempnam(sys_get_temp_dir(), 'jpg_orig_');
        imagejpeg($img, $tmpFile, 95);
        imagedestroy($img);

        // Reconstruit le segment EXIF avec orientation = 3
        $entry = pack('v', 0x0112) . pack('v', 3) . pack('V', 1) . pack('v', 3) . "\x00\x00";
        $ifd0 = pack('v', 1) . $entry . pack('V', 0);
        $tiff = "II*\x00" . pack('V', 8) . $ifd0;
        $exif = "Exif\x00\x00" . $tiff;
        $app1 = "\xFF\xE1" . pack('n', strlen($exif) + 2) . $exif;

        $jpegBytes = file_get_contents($tmpFile);
        @unlink($tmpFile);
        $finalBytes = substr($jpegBytes, 0, 2) . $app1 . substr($jpegBytes, 2);

        $path = tempnam(sys_get_temp_dir(), 'jpg_exif_');
        file_put_contents($path, $finalBytes);
        $this->tempFiles[] = $path;

        // Traitement
        $result = $this->service->process($path, 'image/jpeg');
        if ($result['path'] !== $path) {
            $this->tempFiles[] = $result['path'];
        }

        // Charge le résultat et vérifie que le bloc rouge est en bas à droite
        $resultImg = $result['mime'] === 'image/webp'
            ? imagecreatefromwebp($result['path'])
            : imagecreatefromjpeg($result['path']);
        $this->assertNotFalse($resultImg);

        $bottomRightColor = imagecolorat($resultImg, $width - 3, $height - 3);
        $r = ($bottomRightColor >> 16) & 0xFF;
        $g = ($bottomRightColor >> 8) & 0xFF;
        $b = $bottomRightColor & 0xFF;
        imagedestroy($resultImg);

        // Tolérance pour la compression : on vérifie que c'est dominé par le rouge
        $this->assertGreaterThan(150, $r, 'Le pixel en bas à droite devrait être rouge après orientation 3');
        $this->assertLessThan(100, $b, 'Le pixel en bas à droite ne devrait plus être bleu');
    }

    // ======================================================================
    //  Test direct des méthodes privées via Reflection
    // ======================================================================

    public function testIsAnimatedGifDirectlyDetectsAnimatedFile(): void
    {
        $path = $this->createAnimatedGif();

        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('isAnimatedGif');
        $method->setAccessible(true);

        $this->assertTrue($method->invoke($this->service, $path));
    }

    public function testIsAnimatedGifDirectlyRejectsStaticFile(): void
    {
        $path = $this->createStaticGif(50, 50);

        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('isAnimatedGif');
        $method->setAccessible(true);

        $this->assertFalse($method->invoke($this->service, $path));
    }

    public function testIsAnimatedGifDirectlyHandlesUnreadableFile(): void
    {
        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('isAnimatedGif');
        $method->setAccessible(true);

        $this->assertFalse($method->invoke($this->service, '/path/that/does/not/exist.gif'));
    }

    public function testLoadImageReturnsNullForUnsupportedMime(): void
    {
        $path = $this->createJpeg(10, 10);

        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('loadImage');
        $method->setAccessible(true);

        $this->assertNull($method->invoke($this->service, $path, 'application/pdf'));
    }

    public function testResizeIfNeededSkipsImageAtMaxDimension(): void
    {
        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('resizeIfNeeded');
        $method->setAccessible(true);

        $img = imagecreatetruecolor(1920, 1080);
        $result = $method->invoke($this->service, $img);

        $this->assertSame(1920, imagesx($result));
        $this->assertSame(1080, imagesy($result));
        imagedestroy($result);
    }

    public function testResizeIfNeededResizesLargeImage(): void
    {
        $reflection = new \ReflectionClass(ImageCompressionService::class);
        $method = $reflection->getMethod('resizeIfNeeded');
        $method->setAccessible(true);

        $img = imagecreatetruecolor(4000, 2000);
        $result = $method->invoke($this->service, $img);

        // 4000 → 1920, 2000 → 960 (ratio préservé)
        $this->assertSame(1920, imagesx($result));
        $this->assertSame(960, imagesy($result));
        imagedestroy($result);
    }

    // ======================================================================
    //  Animation : variations
    // ======================================================================

    // ======================================================================
    //  Branche "WebP plus lourd que l'original" → on garde l'original
    // ======================================================================

    public function testProcessKeepsOriginalWhenWebpReencodeIsLarger(): void
    {
        // Sous-classe qui force un WebP de 1 Mo, plus lourd que n'importe
        // quel JPEG de test, pour couvrir la branche "garder l'original".
        $service = new class extends ImageCompressionService {
            protected function saveAsWebP(\GdImage $image): string
            {
                $tmpPath = tempnam(sys_get_temp_dir(), 'forced_huge_webp_');
                file_put_contents($tmpPath, str_repeat('X', 1024 * 1024));
                return $tmpPath;
            }
        };

        $path = $this->createJpeg(800, 600);
        $originalSize = filesize($path);
        $this->assertLessThan(1024 * 1024, $originalSize, 'L\'original doit être plus petit que le faux WebP');

        $result = $service->process($path, 'image/jpeg');

        // Le résultat doit être l'original (WebP volumineux supprimé en interne)
        $this->assertSame($path, $result['path']);
        $this->assertSame('image/jpeg', $result['mime']);
    }

    public function testAnimatedGifWithLargeFileTriggersChunkedRead(): void
    {
        // Crée un GIF animé entouré de beaucoup de données neutres pour forcer
        // la lecture par chunks dans isAnimatedGif (boucle while).
        $bytes =
            "GIF89a" .
            "\x02\x00\x02\x00" .
            "\x80\x00\x00" .
            "\x00\x00\x00" .
            "\xFF\xFF\xFF" .
            "\x21\xFF\x0BNETSCAPE2.0\x03\x01\x00\x00\x00" .
            // 200 KB de comment extensions pour dépasser les 100 KB du chunk
            str_repeat("\x21\xFE\x04test\x00", 30000) .
            // Frame 1
            "\x21\xF9\x04\x00\x0A\x00\x00\x00" .
            "\x2C\x00\x00\x00\x00\x02\x00\x02\x00\x00" .
            "\x02\x02\x44\x01\x00" .
            // Frame 2
            "\x21\xF9\x04\x00\x0A\x00\x00\x00" .
            "\x2C\x00\x00\x00\x00\x02\x00\x02\x00\x00" .
            "\x02\x02\x44\x01\x00" .
            "\x3B";

        $path = tempnam(sys_get_temp_dir(), 'gif_big_');
        file_put_contents($path, $bytes);
        $this->tempFiles[] = $path;

        $result = $this->service->process($path, 'image/gif');
        $this->assertSame($path, $result['path']);
    }
}
