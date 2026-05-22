<?php

namespace App\Tests\Service\Elasticsearch;

use App\Entity\Skill;
use App\Entity\User;
use App\Enum\Availability;
use App\Service\Elasticsearch\ElasticClient;
use App\Service\Elasticsearch\IndexDefinitions;
use App\Service\Elasticsearch\UserIndexer;
use Doctrine\Common\Collections\ArrayCollection;
use PHPUnit\Framework\TestCase;

/**
 * 🎮 Mass Effect - Tests unitaires du UserIndexer
 *
 * Shepard = utilisateur à indexer (héros aux multiples facettes)
 * Normandy = index ES (vaisseau qui transporte les données)
 */
class UserIndexerTest extends TestCase
{
    private ElasticClient $elasticClient;

    protected function setUp(): void
    {
        $this->elasticClient = $this->createMock(ElasticClient::class);
    }

    private function makeIndexer(): UserIndexer
    {
        return new UserIndexer($this->elasticClient);
    }

    private function makeSkill(string $name): Skill
    {
        $skill = $this->createMock(Skill::class);
        $skill->method('getName')->willReturn($name);
        return $skill;
    }

    private function makeUser(int $id = 7): User
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn($id);
        $user->method('getUsername')->willReturn('shepard');
        $user->method('getFirstname')->willReturn('John');
        $user->method('getLastname')->willReturn('Shepard');
        $user->method('getBio')->willReturn('Spectre du Conseil');
        $user->method('getLocation')->willReturn('Citadelle');
        $user->method('getAvailability')->willReturn(Availability::OPEN_TO_WORK);
        $user->method('getAvatarUrl')->willReturn('https://avatar.test/shepard');
        $user->method('getSkills')->willReturn(new ArrayCollection([
            $this->makeSkill('Combat'),
            $this->makeSkill('Diplomatie'),
        ]));
        return $user;
    }

    public function testCreateIndexWhenAbsent(): void
    {
        $this->elasticClient->method('indexExists')->willReturn(false);
        $this->elasticClient->expects($this->once())
            ->method('createIndex')
            ->with(
                IndexDefinitions::USERS_INDEX,
                $this->callback(fn($body) => isset($body['mappings']['properties']['bio']))
            );

        $this->assertTrue($this->makeIndexer()->createIndexIfNotExists());
    }

    public function testCreateIndexSkippedWhenPresent(): void
    {
        $this->elasticClient->method('indexExists')->willReturn(true);
        $this->elasticClient->expects($this->never())->method('createIndex');

        $this->assertFalse($this->makeIndexer()->createIndexIfNotExists());
    }

    public function testIndexSendsExpectedDocument(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('indexDocument')
            ->with(
                IndexDefinitions::USERS_INDEX,
                '7',
                $this->callback(function ($body) {
                    return $body['username'] === 'shepard'
                        && $body['firstname'] === 'John'
                        && $body['bio'] === 'Spectre du Conseil'
                        && $body['availability'] === 'open_to_work'
                        && in_array('Combat', $body['skills'], true)
                        && in_array('Diplomatie', $body['skills'], true);
                })
            );

        $this->makeIndexer()->index($this->makeUser());
    }

    public function testIndexIgnoresUserWithoutId(): void
    {
        $user = $this->createMock(User::class);
        $user->method('getId')->willReturn(null);

        $this->elasticClient->expects($this->never())->method('indexDocument');

        $this->makeIndexer()->index($user);
    }

    public function testIndexSwallowsExceptions(): void
    {
        $this->elasticClient->method('indexDocument')->willThrowException(new \RuntimeException('ES down'));

        $this->makeIndexer()->index($this->makeUser());
        $this->expectNotToPerformAssertions();
    }

    public function testDeleteSendsCorrectId(): void
    {
        $this->elasticClient->expects($this->once())
            ->method('deleteDocument')
            ->with(IndexDefinitions::USERS_INDEX, '7');

        $this->makeIndexer()->delete(7);
    }

    public function testBulkIndexProcessesUsers(): void
    {
        $users = [$this->makeUser(1), $this->makeUser(2)];
        $this->elasticClient->expects($this->once())
            ->method('bulk')
            ->with($this->callback(fn($body) => count($body) === 4));

        $this->assertSame(2, $this->makeIndexer()->bulkIndex($users));
    }

    public function testBulkIndexSkipsEmptyInput(): void
    {
        $this->elasticClient->expects($this->never())->method('bulk');
        $this->assertSame(0, $this->makeIndexer()->bulkIndex([]));
    }
}
