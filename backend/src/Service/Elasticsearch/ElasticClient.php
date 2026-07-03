<?php

namespace App\Service\Elasticsearch;

use Elastic\Elasticsearch\Client;
use Elastic\Elasticsearch\ClientBuilder;

class ElasticClient
{
    private ?Client $client = null;

    public function __construct(
        private readonly string $host,
        private readonly string $username = '',
        private readonly string $password = '',
    ) {}

    public function getClient(): Client
    {
        if ($this->client === null) {
            $builder = ClientBuilder::create()->setHosts([$this->host]);
            if ($this->username !== '' && $this->password !== '') {
                $builder->setBasicAuthentication($this->username, $this->password);
            }
            $this->client = $builder->build();
        }
        return $this->client;
    }

    /**
     * @return array{status: string, cluster_name?: string, number_of_nodes?: int}
     */
    public function health(): array
    {
        $response = $this->getClient()->cluster()->health();
        return $response->asArray();
    }

    public function isAvailable(): bool
    {
        try {
            $this->health();
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    public function indexExists(string $index): bool
    {
        return $this->getClient()->indices()->exists(['index' => $index])->getStatusCode() === 200;
    }

    public function deleteIndex(string $index): void
    {
        $this->getClient()->indices()->delete(['index' => $index]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public function createIndex(string $index, array $body): void
    {
        $this->getClient()->indices()->create(['index' => $index, 'body' => $body]);
    }

    /**
     * @param array<string, mixed> $body
     */
    public function indexDocument(string $index, string $id, array $body): void
    {
        $this->getClient()->index(['index' => $index, 'id' => $id, 'body' => $body]);
    }

    public function deleteDocument(string $index, string $id): void
    {
        $this->getClient()->delete(['index' => $index, 'id' => $id]);
    }

    /**
     * @param array<int, array<string, mixed>> $body
     */
    public function bulk(array $body): void
    {
        $this->getClient()->bulk(['body' => $body]);
    }

    /**
     * @param array<string, mixed> $body
     * @return array<string, mixed>
     */
    public function search(string $index, array $body): array
    {
        $response = $this->getClient()->search([
            'index' => $index,
            'body'  => $body,
        ]);
        return $response->asArray();
    }
}
