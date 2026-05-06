<?php

namespace App\Service\Storage;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;
use Psr\Log\LoggerInterface;

class S3Storage
{
    private S3Client $client;
    private string $bucket;
    private string $publicBaseUrl;
    private LoggerInterface $logger;

    public function __construct(
        string $endpoint,
        string $key,
        string $secret,
        string $bucket,
        string $publicBaseUrl,
        LoggerInterface $logger
    ) {
        $this->client = new S3Client([
            'version' => 'latest',
            'region'  => 'eu-west-1',
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key'    => $key,
                'secret' => $secret,
            ],
        ]);

        $this->bucket = $bucket;
        $this->publicBaseUrl = rtrim($publicBaseUrl, '/');
        $this->logger = $logger;
    }

    /**
     * @param string $key       Nom de l'objet dans le bucket (ex: 1234-image.png)
     * @param string $localPath Chemin local du fichier temporaire (ex: /tmp/php12345)
     * @param string $mimeType  Mime type (image/png, etc.)
     */
    public function upload(string $key, string $localPath, string $mimeType): ?string
    {
        try {
            $this->client->putObject([
                'Bucket'      => $this->bucket,
                'Key'         => $key,
                'SourceFile'  => $localPath,
                'ContentType' => $mimeType,
            ]);

            // MINIO_PUBLIC_URL = ex: http://minio-api.woc/uploads
            return $this->publicBaseUrl . '/' . ltrim($key, '/');

        } catch (AwsException $e) {
            $this->logger->error('MINIO ERROR: ' . $e->getMessage());
            return null;
        }
    }
}
