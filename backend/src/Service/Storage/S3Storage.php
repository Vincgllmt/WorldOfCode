<?php

namespace App\Service\Storage;

use Aws\S3\S3Client;
use Aws\Exception\AwsException;

class S3Storage
{
    private S3Client $client;
    private string $bucket;

    public function __construct(string $endpoint, string $key, string $secret, string $bucket)
    {
        $this->client = new S3Client([
            'version' => 'latest',
            'region'  => 'eu-west-1',
            'endpoint' => $endpoint,
            'use_path_style_endpoint' => true,
            'credentials' => [
                'key' => $key,
                'secret' => $secret,
            ],
        ]);

        $this->bucket = $bucket;
    }

    public function upload(string $key, string $localPath, string $mimeType): ?string
    {
        try {
            $result = $this->client->putObject([
                'Bucket' => $this->bucket,
                'Key'    => $key,
                'SourceFile' => $localPath,
                'ContentType' => $mimeType,
            ]);

            // URL publique utilisable côté frontend
            return sprintf('http://localhost:9000/%s/%s', $this->bucket, $key);

        } catch (AwsException $e) {
            error_log("MINIO ERROR: " . $e->getMessage());
            return null;
        }
    }

}
