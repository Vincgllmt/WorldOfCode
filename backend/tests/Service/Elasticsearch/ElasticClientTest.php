<?php

namespace App\Tests\Service\Elasticsearch;

use App\Service\Elasticsearch\ElasticClient;
use Elastic\Elasticsearch\ClientBuilder;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Psr18Client;
use Symfony\Component\HttpClient\Response\MockResponse;

/**
 * 🎮 Death Stranding - Tests unitaires du ElasticClient
 *
 * Sam Porter Bridges = le client HTTP (livre les requêtes au cluster)
 * Chiral Network      = le cluster Elasticsearch (répond, ou tombe en panne)
 */
class ElasticClientTest extends TestCase
{
    /**
     * Construit un ElasticClient dont le client Elasticsearch interne est réel,
     * mais branché sur un transport HTTP simulé (aucun appel réseau).
     *
     * @param (MockResponse|callable)[] $responses
     */
    private function makeClient(array $responses): ElasticClient
    {
        $psr18Client = new Psr18Client(new MockHttpClient($responses));

        $realClient = ClientBuilder::create()
            ->setHosts(['http://elastic.test:9200'])
            ->setHttpClient($psr18Client)
            ->build();

        $elasticClient = new ElasticClient('http://elastic.test:9200');

        $clientProp = new \ReflectionProperty(ElasticClient::class, 'client');
        $clientProp->setValue($elasticClient, $realClient);

        return $elasticClient;
    }

    private function jsonResponse(array $body, int $statusCode = 200): MockResponse
    {
        return new MockResponse(json_encode($body, JSON_THROW_ON_ERROR), [
            'http_code'        => $statusCode,
            'response_headers' => [
                'Content-Type'      => 'application/json',
                'X-Elastic-Product' => 'Elasticsearch',
            ],
        ]);
    }

    // ======================================================================
    //  health()
    // ======================================================================

    public function testHealthReturnsClusterStatus(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['status' => 'green', 'cluster_name' => 'woc', 'number_of_nodes' => 1]),
        ]);

        $health = $client->health();

        $this->assertSame('green', $health['status']);
        $this->assertSame('woc', $health['cluster_name']);
        $this->assertSame(1, $health['number_of_nodes']);
    }

    // ======================================================================
    //  isAvailable()
    // ======================================================================

    public function testIsAvailableReturnsTrueWhenHealthSucceeds(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['status' => 'green']),
        ]);

        $this->assertTrue($client->isAvailable());
    }

    public function testIsAvailableReturnsFalseWhenClusterIsUnreachable(): void
    {
        $client = $this->makeClient([
            new MockResponse('', ['http_code' => 500]),
        ]);

        $this->assertFalse($client->isAvailable());
    }

    // ======================================================================
    //  indexExists()
    // ======================================================================

    public function testIndexExistsReturnsTrueWhenIndexIsPresent(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse([]),
        ]);

        $this->assertTrue($client->indexExists('users'));
    }

    public function testIndexExistsReturnsFalseWhenIndexIsAbsent(): void
    {
        $client = $this->makeClient([
            new MockResponse('', ['http_code' => 404]),
        ]);

        $this->assertFalse($client->indexExists('users'));
    }

    // ======================================================================
    //  deleteIndex()
    // ======================================================================

    public function testDeleteIndexSendsDeleteRequest(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['acknowledged' => true]),
        ]);

        $client->deleteIndex('users');
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  createIndex()
    // ======================================================================

    public function testCreateIndexSendsCreateRequest(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['acknowledged' => true, 'index' => 'users']),
        ]);

        $client->createIndex('users', ['mappings' => ['properties' => []]]);
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  deleteDocument()
    // ======================================================================

    public function testDeleteDocumentSendsDeleteRequest(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['result' => 'deleted']),
        ]);

        $client->deleteDocument('users', '7');
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  bulk()
    // ======================================================================

    public function testBulkSendsBulkRequest(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse(['errors' => false, 'items' => []]),
        ]);

        $client->bulk([
            ['index' => ['_index' => 'users', '_id' => '1']],
            ['username' => 'wolf'],
        ]);
        $this->expectNotToPerformAssertions();
    }

    // ======================================================================
    //  search()
    // ======================================================================

    public function testSearchReturnsDecodedResults(): void
    {
        $client = $this->makeClient([
            $this->jsonResponse([
                'hits' => [
                    'total' => ['value' => 1],
                    'hits'  => [['_id' => '1', '_source' => ['username' => 'wolf']]],
                ],
            ]),
        ]);

        $result = $client->search('users', ['query' => ['match_all' => new \stdClass()]]);

        $this->assertSame(1, $result['hits']['total']['value']);
        $this->assertSame('wolf', $result['hits']['hits'][0]['_source']['username']);
    }
}
