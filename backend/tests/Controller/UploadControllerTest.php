<?php

namespace App\Tests\Controller;

use App\Controller\UploadController;
use App\Service\Storage\S3Storage;
use PHPUnit\Framework\TestCase;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;

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
        $controller = new UploadController();
        $controller->setContainer($this->createMock(ContainerInterface::class));

        return $controller;
    }

    private function buildUploadedFile(string $name = 'lambda_photo.jpg', string $mime = 'image/jpeg'): UploadedFile
    {
        $file = $this->createMock(UploadedFile::class);
        $file->method('getClientOriginalName')->willReturn($name);
        $file->method('getPathname')->willReturn('/tmp/' . $name);
        $file->method('getMimeType')->willReturn($mime);

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
        $response = $this->makeController()->upload($request, $s3);

        $this->assertSame(200, $response->getStatusCode());
        $payload = json_decode($response->getContent() ?: '', true, 512, JSON_THROW_ON_ERROR);
        $this->assertArrayHasKey('url', $payload);
        $this->assertStringContainsString('lambda_photo.jpg', $payload['url']);
    }

    public function testUploadFailsWhenNoFileProvided(): void
    {
        $s3 = $this->createMock(S3Storage::class);

        $request  = new Request();
        $response = $this->makeController()->upload($request, $s3);

        $this->assertSame(400, $response->getStatusCode());
    }

    public function testUploadFailsWhenS3ReturnsNull(): void
    {
        $file = $this->buildUploadedFile();

        $s3 = $this->createMock(S3Storage::class);
        $s3->method('upload')->willReturn(null);

        $request  = new Request([], [], [], [], ['file' => $file]);
        $response = $this->makeController()->upload($request, $s3);

        $this->assertSame(500, $response->getStatusCode());
    }
}
