<?php

namespace App\Tests\Service;

use App\Service\Storage\S3Storage;
use Aws\Exception\AwsException;
use Aws\S3\S3Client;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;

/**
 * 🎮 Minecraft - Tests unitaires du S3Storage
 *
 * SteveBuilder  = client qui uploade des fichiers dans le bucket
 * HerobrineVoid = erreur AWS qui fait échouer l'upload
 */
class S3StorageTest extends TestCase
{
    // ======================================================================
    //  Helpers
    // ======================================================================

    private function makeStorage(S3Client $client, string $publicBaseUrl = 'http://minio.minecraft'): S3Storage
    {
        $storage = new S3Storage(
            'http://minio.test',
            'SteveKey',
            'CreeperSecret',
            'minecraft-bucket',
            $publicBaseUrl,
            new NullLogger()
        );

        $clientProp = new \ReflectionProperty(S3Storage::class, 'client');
        $clientProp->setValue($storage, $client);

        return $storage;
    }

    // ======================================================================
    //  upload()
    // ======================================================================

    private function mockS3Client(): S3Client
    {
        return $this->getMockBuilder(S3Client::class)
            ->disableOriginalConstructor()
            ->addMethods(['putObject'])
            ->getMock();
    }

    public function testUploadSuccessReturnsPublicUrl(): void
    {
        $s3Client = $this->mockS3Client();
        $s3Client->method('putObject')->willReturn([]);

        $storage = $this->makeStorage($s3Client);
        $url = $storage->upload('diamond_sword.png', '/tmp/diamond_sword.png', 'image/png');

        $this->assertNotNull($url);
        $this->assertStringContainsString('diamond_sword.png', $url);
        $this->assertStringStartsWith('http://minio.minecraft/', $url);
    }

    public function testUploadSuccessBuildUrlFromKeyAndBaseUrl(): void
    {
        $s3Client = $this->mockS3Client();
        $s3Client->method('putObject')->willReturn([]);

        $storage = $this->makeStorage($s3Client, 'http://minio.minecraft');
        $url = $storage->upload('creeper_face.jpg', '/tmp/creeper_face.jpg', 'image/jpeg');

        $this->assertSame('http://minio.minecraft/creeper_face.jpg', $url);
    }

    public function testUploadSuccessStripsLeadingSlashFromKey(): void
    {
        $s3Client = $this->mockS3Client();
        $s3Client->method('putObject')->willReturn([]);

        $storage = $this->makeStorage($s3Client, 'http://minio.minecraft');
        $url = $storage->upload('/steve_skin.png', '/tmp/steve_skin.png', 'image/png');

        $this->assertSame('http://minio.minecraft/steve_skin.png', $url);
    }

    public function testUploadFailsWhenAwsThrowsExceptionReturnsNull(): void
    {
        $s3Client  = $this->mockS3Client();
        $command   = $this->createMock(\Aws\CommandInterface::class);
        $exception = new AwsException('Herobrine blocked the upload', $command);

        $s3Client->method('putObject')->willThrowException($exception);

        $storage = $this->makeStorage($s3Client);
        $url = $storage->upload('enderman.png', '/tmp/enderman.png', 'image/png');

        $this->assertNull($url);
    }

    public function testUploadBaseUrlTrailingSlashIsNormalized(): void
    {
        $s3Client = $this->mockS3Client();
        $s3Client->method('putObject')->willReturn([]);

        // Base URL avec slash final — doit produire la même URL que sans slash
        $storage = $this->makeStorage($s3Client, 'http://minio.minecraft/');
        $url = $storage->upload('grass_block.png', '/tmp/grass_block.png', 'image/png');

        $this->assertSame('http://minio.minecraft/grass_block.png', $url);
    }
}
