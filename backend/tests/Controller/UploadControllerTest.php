<?php

namespace App\Tests\Controller;

use App\Controller\UploadController;
use App\Service\ImageCompressionService;
use App\Service\Storage\S3Storage;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

/**
 * 🎮 Half-Life - Tests unitaires du UploadController
 *
 * GordonFreeman = contexte de test (the silent protagonist)
 */
class UploadControllerTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function makeController(): UploadController
    {
        $token = $this->createMock(TokenInterface::class);

        $tokenStorage = $this->createMock(TokenStorageInterface::class);
        $tokenStorage->method('getToken')->willReturn($token);

        $authChecker = $this->createMock(AuthorizationCheckerInterface::class);
        $authChecker->method('isGranted')->willReturn(true);

        $container = $this->createMock(ContainerInterface::class);
        $container->method('has')->willReturnCallback(
            fn(string $id) => in_array($id, ['security.token_storage', 'security.authorization_checker'], true)
        );
        $container->method('get')->willReturnCallback(
            fn(string $id) => match ($id) {
                'security.token_storage'         => $tokenStorage,
                'security.authorization_checker' => $authChecker,
                default => throw new \RuntimeException("Service inattendu : $id"),
            }
        );

        $controller = new UploadController();
        $controller->setContainer($container);

        return $controller;
    }

    private function buildUploadedFile(
        string $name = 'lambda_photo.jpg',
        string $mime = 'image/jpeg',
        int $sizeBytes = 1024,
    ): UploadedFile {
        $file = $this->createMock(UploadedFile::class);
        $file->method('getClientOriginalName')->willReturn($name);
        $file->method('getPathname')->willReturn('/tmp/' . $name);
        $file->method('getMimeType')->willReturn($mime);
        $file->method('getSize')->willReturn($sizeBytes);

        return $file;
    }

    // ======================================================================
    //  upload()
    // ======================================================================

    public function testUploadSuccess(): void
    {
        $file = $this->buildUploadedFile();

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn('http://minio.local/uploads/lambda_photo.jpg');

        $request = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('url', $payload);
        $this->assertStringContainsString('lambda_photo.jpg', $payload['url']);
    }

    public function testUploadFailsWhenNoFileProvided(): void
    {
        $s3 = $this->createMock(S3Storage::class);

        $request  = new Request();
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testUploadFailsWhenS3ReturnsNull(): void
    {
        $file = $this->buildUploadedFile();

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn(null);

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(500, $response->getStatusCode());
    }

    public function testUploadRejectsUnsupportedMimeType(): void
    {
        $file = $this->buildUploadedFile('malware.exe', 'application/octet-stream');
        $s3   = $this->createMock(S3Storage::class);

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(415, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUploadRejectsOversizedFile(): void
    {
        $sixMb = 6 * 1024 * 1024;
        $file  = $this->buildUploadedFile('heavy.jpg', 'image/jpeg', $sixMb);
        $s3    = $this->createMock(S3Storage::class);

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(413, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    // ======================================================================
    //  ZIP — support fichiers messagerie
    // ======================================================================

    public function testUploadZipSuccess(): void
    {
        $file = $this->buildUploadedFile('archive.zip', 'application/zip', 1024 * 1024);

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn('http://minio.local/uploads/archive.zip');

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('url', $payload);
    }

    public function testUploadXZipCompressedSuccess(): void
    {
        $file = $this->buildUploadedFile('archive.zip', 'application/x-zip-compressed', 512 * 1024);

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn('http://minio.local/uploads/archive.zip');

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
    }

    public function testUploadZipRejectsOversized(): void
    {
        $elevenMb = 11 * 1024 * 1024;
        $file     = $this->buildUploadedFile('heavy.zip', 'application/zip', $elevenMb);
        $s3       = $this->createMock(S3Storage::class);

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(413, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('error', $payload);
    }

    public function testUploadZipUnderImageLimitButOverImageSizePassesWithFileSizeLimit(): void
    {
        // 7 Mo : dépasse la limite image (5 Mo) mais pas la limite fichier (10 Mo)
        $sevenMb = 7 * 1024 * 1024;
        $file    = $this->buildUploadedFile('medium.zip', 'application/zip', $sevenMb);

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn('http://minio.local/uploads/medium.zip');

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
    }

    // ======================================================================
    //  Intégration ImageCompressionService — fichiers réels
    // ======================================================================

    /** @var string[] */
    private array $tempFiles = [];

    protected function tearDown(): void
    {
        foreach ($this->tempFiles as $path) {
            if (file_exists($path)) {
                @unlink($path);
            }
        }
        $this->tempFiles = [];
    }

    /**
     * Crée un vrai fichier JPEG sur disque et retourne un UploadedFile pointant
     * vers ce fichier (mode `test = true` pour bypasser le check is_uploaded_file).
     */
    private function makeRealJpegUploadedFile(int $width, int $height): UploadedFile
    {
        if (!extension_loaded('gd')) {
            $this->markTestSkipped('Extension GD non installée');
        }

        $img = imagecreatetruecolor($width, $height);
        $red = imagecolorallocate($img, 255, 0, 0);
        imagefilledrectangle($img, 0, 0, $width - 1, $height - 1, $red);

        $path = tempnam(sys_get_temp_dir(), 'upload_real_');
        imagejpeg($img, $path, 90);
        imagedestroy($img);
        $this->tempFiles[] = $path;

        return new UploadedFile($path, 'photo.jpg', 'image/jpeg', null, true);
    }

    public function testLargeImageIsCompressedToWebp(): void
    {
        // Image 3000x2000 → doit être redimensionnée à 1920px max + convertie en WebP
        $file = $this->makeRealJpegUploadedFile(3000, 2000);

        $capturedKey  = null;
        $capturedMime = null;
        $capturedDimensions = null;
        $s3 = $this->createMock(S3Storage::class);
        // Capture des infos AU MOMENT de l'upload, avant que le controller
        // ne nettoie le fichier temporaire compressé.
        $s3->method('upload')
           ->willReturnCallback(function (string $key, string $path, string $mime) use (&$capturedKey, &$capturedMime, &$capturedDimensions) {
               $capturedKey  = $key;
               $capturedMime = $mime;
               $info = getimagesize($path);
               $capturedDimensions = $info !== false ? [$info[0], $info[1]] : null;
               return 'http://minio.local/uploads/' . $key;
           });

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame('image/webp', $capturedMime);
        $this->assertStringEndsWith('.webp', $capturedKey);

        // Dimensions doivent être ≤ 1920
        $this->assertNotNull($capturedDimensions);
        $this->assertLessThanOrEqual(1920, max($capturedDimensions[0], $capturedDimensions[1]));
    }

    public function testCompressedKeyContainsTimestamp(): void
    {
        $file = $this->makeRealJpegUploadedFile(2400, 1600);

        $capturedKey = null;
        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')
           ->willReturnCallback(function (string $key) use (&$capturedKey) {
               $capturedKey = $key;
               return 'http://minio.local/' . $key;
           });

        $request = new Request([], [], [], [], ['file' => $file]);
        $this->makeController()->upload($request, $s3, new ImageCompressionService());

        // SEC-4 (fixé) : clé non-devinable au format <timestamp>-<32 hex chars>.<ext>
        // (32 hex = 16 bytes random = 128 bits d'entropie via random_bytes).
        $this->assertMatchesRegularExpression('/^\d{10,}-[0-9a-f]{32}\.webp$/', $capturedKey);
    }

    public function testCompressedFileIsCleanedUpAfterUpload(): void
    {
        $file = $this->makeRealJpegUploadedFile(2500, 1500);

        $compressedPath = null;
        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')
           ->willReturnCallback(function (string $key, string $path) use (&$compressedPath) {
               $compressedPath = $path;
               // Vérifier que le fichier compressé existe au moment de l'upload
               return file_exists($path) ? 'http://minio.local/ok' : false;
           });

        $request = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3, new ImageCompressionService());

        $this->assertSame(200, $response->getStatusCode());
        $this->assertNotNull($compressedPath);
        // Après le retour du controller, le fichier compressé temporaire doit être supprimé
        $this->assertFileDoesNotExist($compressedPath);
    }
}
