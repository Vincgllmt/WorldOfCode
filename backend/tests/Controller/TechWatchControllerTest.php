<?php

namespace App\Tests\Controller;

use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use App\Entity\User;
use App\Enum\UserRole;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * 🎮 Cyberpunk 2077 - Tests du TechWatchController (flux RSS / veille tech)
 *
 * VNightCity    = administrateur (gère les sources RSS)
 * JackieWelles  = utilisateur standard (consulte le feed)
 */
class TechWatchControllerTest extends WebTestCase
{
    private EntityManagerInterface $em;
    private KernelBrowser $client;
    private ?string $adminToken = null;
    private ?string $userToken = null;

    // 🎮 Cyberpunk 2077 credentials
    private const ADMIN_USERNAME = 'VNightCity';
    private const ADMIN_PASSWORD = 'Samurai2077!@2024';
    private const ADMIN_EMAIL = 'v@nightcity.net';

    private const USER_USERNAME = 'JackieWelles';
    private const USER_PASSWORD = 'TuMiTiempo!@2024';
    private const USER_EMAIL = 'jackie@nightcity.net';

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $container = static::getContainer();

        $this->em = $container->get(EntityManagerInterface::class);
        $hasher = $container->get(UserPasswordHasherInterface::class);

        // Nettoyer la base entre chaque test
        $conn = $this->em->getConnection();
        $conn->executeStatement('DELETE FROM tech_watch_item');
        $conn->executeStatement('DELETE FROM tech_watch_source');
        $conn->executeStatement('DELETE FROM techgroup_user');
        $conn->executeStatement('DELETE FROM tech_group');
        $conn->executeStatement('DELETE FROM user');

        // Créer l'admin (V)
        $admin = new User();
        $admin->setUsername(self::ADMIN_USERNAME);
        $admin->setEmail(self::ADMIN_EMAIL);
        $admin->setFirstname('V');
        $admin->setLastname('NightCity');
        $admin->setPassword($hasher->hashPassword($admin, self::ADMIN_PASSWORD));
        $admin->setRole(UserRole::ROLE_ADMIN);
        $this->em->persist($admin);

        // Créer l'utilisateur standard (Jackie)
        $user = new User();
        $user->setUsername(self::USER_USERNAME);
        $user->setEmail(self::USER_EMAIL);
        $user->setFirstname('Jackie');
        $user->setLastname('Welles');
        $user->setPassword($hasher->hashPassword($user, self::USER_PASSWORD));
        $user->setRole(UserRole::ROLE_USER);
        $this->em->persist($user);

        $this->em->flush();

        // Obtenir les tokens JWT
        $this->adminToken = $this->authenticate(self::ADMIN_USERNAME, self::ADMIN_PASSWORD);
        $this->userToken = $this->authenticate(self::USER_USERNAME, self::USER_PASSWORD);
    }

    // ========== HELPERS ==========

    private function authenticate(string $username, string $password): string
    {
        $user = $this->em->getRepository(User::class)->findOneBy(['username' => $username]);
        $jwtManager = static::getContainer()->get(JWTTokenManagerInterface::class);

        return $jwtManager->create($user);
    }

    private function createGroup(string $name): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);
        $group->setDescription("Groupe {$name} de Night City");
        $this->em->persist($group);
        return $group;
    }

    private function createSource(TechGroup $group, string $name, string $feedUrl): TechWatchSource
    {
        $source = new TechWatchSource();
        $source->setTechGroup($group);
        $source->setName($name);
        $source->setFeedUrl($feedUrl);
        $this->em->persist($source);
        return $source;
    }

    private function requestAsAdmin(string $method, string $uri, ?array $body = null): void
    {
        $this->client->request($method, $uri, [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->adminToken,
        ], $body ? json_encode($body) : null);
    }

    private function requestAsUser(string $method, string $uri, ?array $body = null): void
    {
        $this->client->request($method, $uri, [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_AUTHORIZATION' => 'Bearer ' . $this->userToken,
        ], $body ? json_encode($body) : null);
    }

    // ========== TESTS OK - GET SOURCES ==========

    /**
     * Un admin peut lister les sources RSS d'un groupe
     */
    public function testGetSourcesAsAdminReturnsOk(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->createSource($group, 'Arasaka Feed', 'https://arasaka.corp/rss.xml');
        $this->createSource($group, 'Militech Feed', 'https://militech.corp/feed');
        $this->em->flush();

        $this->requestAsAdmin('GET', '/api/group/' . $group->getId() . '/tech-watch/sources');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertCount(2, $data);
        $this->assertEquals('Arasaka Feed', $data[0]['name']);
        $this->assertEquals('https://arasaka.corp/rss.xml', $data[0]['feedUrl']);
        $this->assertArrayHasKey('techGroupId', $data[0]);
        $this->assertArrayHasKey('techGroupName', $data[0]);
    }

    // ========== TESTS NOK - GET SOURCES ==========

    /**
     * Un utilisateur non-admin ne peut pas lister les sources
     */
    public function testGetSourcesAsUserReturnsForbidden(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->em->flush();

        $this->requestAsUser('GET', '/api/group/' . $group->getId() . '/tech-watch/sources');

        $this->assertResponseStatusCodeSame(403);
    }

    /**
     * Lister les sources d'un groupe inexistant retourne 404
     */
    public function testGetSourcesForNonExistentGroupReturns404(): void
    {
        $this->requestAsAdmin('GET', '/api/group/99999/tech-watch/sources');

        $this->assertResponseStatusCodeSame(404);
    }

    // ========== TESTS OK - CREATE SOURCE ==========

    /**
     * Un admin peut créer une source RSS
     */
    public function testCreateSourceAsAdminReturns201(): void
    {
        $group = $this->createGroup('Braindance');
        $this->em->flush();

        $this->requestAsAdmin('POST', '/api/group/' . $group->getId() . '/tech-watch/sources', [
            'feedUrl' => 'https://braindance.nc/rss.xml',
            'name' => 'BD Tech News',
        ]);

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('BD Tech News', $data['name']);
        $this->assertEquals('https://braindance.nc/rss.xml', $data['feedUrl']);
        $this->assertEquals($group->getId(), $data['techGroupId']);
    }

    // ========== TESTS NOK - CREATE SOURCE ==========

    /**
     * Un utilisateur non-admin ne peut pas créer de source
     */
    public function testCreateSourceAsUserReturnsForbidden(): void
    {
        $group = $this->createGroup('Braindance');
        $this->em->flush();

        $this->requestAsUser('POST', '/api/group/' . $group->getId() . '/tech-watch/sources', [
            'feedUrl' => 'https://hack.nc/rss.xml',
            'name' => 'Hack Feed',
        ]);

        $this->assertResponseStatusCodeSame(403);
    }

    /**
     * Créer une source sans feedUrl retourne 400
     */
    public function testCreateSourceWithoutFeedUrlReturns400(): void
    {
        $group = $this->createGroup('Braindance');
        $this->em->flush();

        $this->requestAsAdmin('POST', '/api/group/' . $group->getId() . '/tech-watch/sources', [
            'name' => 'BD Tech News',
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    /**
     * Créer une source sans name retourne 400
     */
    public function testCreateSourceWithoutNameReturns400(): void
    {
        $group = $this->createGroup('Braindance');
        $this->em->flush();

        $this->requestAsAdmin('POST', '/api/group/' . $group->getId() . '/tech-watch/sources', [
            'feedUrl' => 'https://braindance.nc/rss.xml',
        ]);

        $this->assertResponseStatusCodeSame(400);
    }

    /**
     * Créer une source sur un groupe inexistant retourne 404
     */
    public function testCreateSourceForNonExistentGroupReturns404(): void
    {
        $this->requestAsAdmin('POST', '/api/group/99999/tech-watch/sources', [
            'feedUrl' => 'https://ghost.nc/rss.xml',
            'name' => 'Ghost Feed',
        ]);

        $this->assertResponseStatusCodeSame(404);
    }

    // ========== TESTS OK - UPDATE SOURCE ==========

    /**
     * Un admin peut modifier une source RSS (nom + url)
     */
    public function testUpdateSourceAsAdminReturnsOk(): void
    {
        $group = $this->createGroup('Cyberware');
        $source = $this->createSource($group, 'Old Name', 'https://old.nc/rss.xml');
        $this->em->flush();

        $this->requestAsAdmin('PUT', '/api/group/' . $group->getId() . '/tech-watch/sources/' . $source->getId(), [
            'feedUrl' => 'https://new.nc/rss.xml',
            'name' => 'New Name',
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('New Name', $data['name']);
        $this->assertEquals('https://new.nc/rss.xml', $data['feedUrl']);
    }

    /**
     * Un admin peut modifier partiellement une source (seulement le nom)
     */
    public function testUpdateSourcePartiallyOnlyName(): void
    {
        $group = $this->createGroup('Cyberware');
        $source = $this->createSource($group, 'Old Name', 'https://keep.nc/rss.xml');
        $this->em->flush();

        $this->requestAsAdmin('PUT', '/api/group/' . $group->getId() . '/tech-watch/sources/' . $source->getId(), [
            'name' => 'Updated Name',
        ]);

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals('Updated Name', $data['name']);
        $this->assertEquals('https://keep.nc/rss.xml', $data['feedUrl']);
    }

    // ========== TESTS NOK - UPDATE SOURCE ==========

    /**
     * Un utilisateur non-admin ne peut pas modifier une source
     */
    public function testUpdateSourceAsUserReturnsForbidden(): void
    {
        $group = $this->createGroup('Cyberware');
        $source = $this->createSource($group, 'Ripperdoc Feed', 'https://ripper.nc/rss.xml');
        $this->em->flush();

        $this->requestAsUser('PUT', '/api/group/' . $group->getId() . '/tech-watch/sources/' . $source->getId(), [
            'name' => 'Hacked Name',
        ]);

        $this->assertResponseStatusCodeSame(403);
    }

    /**
     * Modifier une source inexistante retourne 404
     */
    public function testUpdateNonExistentSourceReturns404(): void
    {
        $group = $this->createGroup('Cyberware');
        $this->em->flush();

        $this->requestAsAdmin('PUT', '/api/group/' . $group->getId() . '/tech-watch/sources/99999', [
            'name' => 'Ghost',
        ]);

        $this->assertResponseStatusCodeSame(404);
    }

    /**
     * Modifier une source d'un autre groupe retourne 404
     */
    public function testUpdateSourceFromWrongGroupReturns404(): void
    {
        $group1 = $this->createGroup('Netrunning');
        $group2 = $this->createGroup('Solo');
        $source = $this->createSource($group1, 'Net Feed', 'https://net.nc/rss.xml');
        $this->em->flush();

        $this->requestAsAdmin('PUT', '/api/group/' . $group2->getId() . '/tech-watch/sources/' . $source->getId(), [
            'name' => 'Hacked',
        ]);

        $this->assertResponseStatusCodeSame(404);
    }

    // ========== TESTS OK - DELETE SOURCE ==========

    /**
     * Un admin peut supprimer une source RSS
     */
    public function testDeleteSourceAsAdminReturnsOk(): void
    {
        $group = $this->createGroup('Fixers');
        $source = $this->createSource($group, 'Fixer Feed', 'https://fixer.nc/rss.xml');
        $this->em->flush();
        $sourceId = $source->getId();

        $this->requestAsAdmin('DELETE', '/api/group/' . $group->getId() . '/tech-watch/sources/' . $sourceId);

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertTrue($data['success']);

        // Vérifier que la source a bien été supprimée en base
        $this->em->clear();
        $deleted = $this->em->getRepository(TechWatchSource::class)->find($sourceId);
        $this->assertNull($deleted);
    }

    // ========== TESTS NOK - DELETE SOURCE ==========

    /**
     * Un utilisateur non-admin ne peut pas supprimer une source
     */
    public function testDeleteSourceAsUserReturnsForbidden(): void
    {
        $group = $this->createGroup('Fixers');
        $source = $this->createSource($group, 'Fixer Feed', 'https://fixer.nc/rss.xml');
        $this->em->flush();

        $this->requestAsUser('DELETE', '/api/group/' . $group->getId() . '/tech-watch/sources/' . $source->getId());

        $this->assertResponseStatusCodeSame(403);
    }

    /**
     * Supprimer une source inexistante retourne 404
     */
    public function testDeleteNonExistentSourceReturns404(): void
    {
        $group = $this->createGroup('Fixers');
        $this->em->flush();

        $this->requestAsAdmin('DELETE', '/api/group/' . $group->getId() . '/tech-watch/sources/99999');

        $this->assertResponseStatusCodeSame(404);
    }

    /**
     * Supprimer une source d'un autre groupe retourne 404
     */
    public function testDeleteSourceFromWrongGroupReturns404(): void
    {
        $group1 = $this->createGroup('Fixers');
        $group2 = $this->createGroup('NCPD');
        $source = $this->createSource($group1, 'Fixer Feed', 'https://fixer.nc/rss.xml');
        $this->em->flush();

        $this->requestAsAdmin('DELETE', '/api/group/' . $group2->getId() . '/tech-watch/sources/' . $source->getId());

        $this->assertResponseStatusCodeSame(404);
    }

    // ========== TESTS OK - GET ITEMS ==========

    /**
     * Un utilisateur authentifié peut lister les articles d'un groupe
     */
    public function testGetItemsAsUserReturnsOk(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->em->flush();

        $this->requestAsUser('GET', '/api/group/' . $group->getId() . '/tech-watch');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('items', $data);
        $this->assertArrayHasKey('totalItems', $data);
        $this->assertArrayHasKey('page', $data);
        $this->assertArrayHasKey('limit', $data);
    }

    /**
     * La pagination par défaut est page 1, limit 20
     */
    public function testGetItemsDefaultPagination(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->em->flush();

        $this->requestAsUser('GET', '/api/group/' . $group->getId() . '/tech-watch');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(1, $data['page']);
        $this->assertEquals(20, $data['limit']);
    }

    /**
     * La pagination custom fonctionne
     */
    public function testGetItemsCustomPagination(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->em->flush();

        $this->requestAsUser('GET', '/api/group/' . $group->getId() . '/tech-watch?page=2&limit=5');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(2, $data['page']);
        $this->assertEquals(5, $data['limit']);
    }

    /**
     * La limite max est 50
     */
    public function testGetItemsLimitIsCappedAt50(): void
    {
        $group = $this->createGroup('Netrunning');
        $this->em->flush();

        $this->requestAsUser('GET', '/api/group/' . $group->getId() . '/tech-watch?limit=100');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(50, $data['limit']);
    }

    // ========== TESTS NOK - GET ITEMS ==========

    /**
     * Lister les articles d'un groupe inexistant retourne 404
     */
    public function testGetItemsForNonExistentGroupReturns404(): void
    {
        $this->requestAsUser('GET', '/api/group/99999/tech-watch');

        $this->assertResponseStatusCodeSame(404);
    }

    // ========== TESTS OK - GET FEED ==========

    /**
     * Un utilisateur authentifié peut accéder à son feed agrégé
     */
    public function testGetFeedAsUserReturnsOk(): void
    {
        $this->requestAsUser('GET', '/api/tech-watch/feed');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertArrayHasKey('items', $data);
        $this->assertArrayHasKey('totalItems', $data);
        $this->assertArrayHasKey('page', $data);
        $this->assertArrayHasKey('limit', $data);
    }

    /**
     * Le feed retourne les articles des groupes rejoints par l'utilisateur
     */
    public function testGetFeedReturnsItemsFromJoinedGroups(): void
    {
        $jackie = $this->em->getRepository(User::class)->findOneBy(['username' => self::USER_USERNAME]);
        $group = $this->createGroup('Edgerunners');
        $group->addUser($jackie);
        $this->em->flush();

        $this->requestAsUser('GET', '/api/tech-watch/feed');

        $this->assertResponseIsSuccessful();
        $data = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertEquals(0, $data['totalItems']);
        $this->assertIsArray($data['items']);
    }

    // ========== TESTS NOK - GET FEED ==========

    /**
     * Un utilisateur non authentifié ne peut pas accéder au feed
     */
    public function testGetFeedWithoutAuthReturns401(): void
    {
        $this->client->request('GET', '/api/tech-watch/feed');

        $this->assertResponseStatusCodeSame(401);
    }
}
