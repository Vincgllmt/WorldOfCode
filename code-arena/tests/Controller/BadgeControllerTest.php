<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\BadgeController;
use Doctrine\DBAL\Connection;
use PHPUnit\Framework\TestCase;

/**
 * 🌿 Ori and the Blind Forest — BadgeController
 *
 * OriBeinLight = joueur dont on consulte les badges gagnés dans l'arène.
 */
final class BadgeControllerTest extends TestCase
{
    // 🌿 Ori credentials
    private const USER_ID = 11;

    // ========== OK ==========

    /**
     * Les badges d'OriBeinLight sont retournés avec tous les champs attendus.
     */
    public function testUserBadgesReturnsFormattedBadgeList(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([
            [
                'badge_id'       => '5',
                'name'           => 'Premier Pas',
                'description'    => 'Premier défi résolu',
                'icon'           => '🌟',
                'challenge_slug' => 'forest',
                'awarded_at'     => '2025-01-15 10:00:00',
            ],
        ]);

        $response = (new BadgeController())->userBadges(self::USER_ID, $connection);

        $this->assertSame(200, $response->getStatusCode());
        $data = json_decode($response->getContent(), true);
        $this->assertCount(1, $data);
        $this->assertSame(5, $data[0]['badgeId']);
        $this->assertSame('Premier Pas', $data[0]['name']);
        $this->assertSame('forest', $data[0]['challengeSlug']);
        $this->assertStringContainsString('2025-01-15', $data[0]['awardedAt']);
    }

    /**
     * Un utilisateur sans badge reçoit un tableau vide.
     */
    public function testUserWithNoBadgesReturnsEmptyArray(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([]);

        $response = (new BadgeController())->userBadges(99, $connection);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertSame([], json_decode($response->getContent(), true));
    }

    /**
     * Plusieurs badges sont tous retournés.
     */
    public function testUserBadgesReturnsMultipleBadges(): void
    {
        $rows = [
            ['badge_id' => '1', 'name' => 'First Solve', 'description' => null, 'icon' => null, 'challenge_slug' => 'forest', 'awarded_at' => '2025-02-01 08:00:00'],
            ['badge_id' => '2', 'name' => 'Perfect',     'description' => null, 'icon' => null, 'challenge_slug' => 'blind',  'awarded_at' => '2025-02-10 12:00:00'],
        ];
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn($rows);

        $response = (new BadgeController())->userBadges(self::USER_ID, $connection);

        $this->assertSame(200, $response->getStatusCode());
        $this->assertCount(2, json_decode($response->getContent(), true));
    }

    // ========== NOK ==========

    /**
     * Un champ description null est retourné tel quel dans la réponse.
     */
    public function testUserBadgesWithNullDescriptionAndIconAreReturnedAsNull(): void
    {
        $connection = $this->createStub(Connection::class);
        $connection->method('fetchAllAssociative')->willReturn([
            ['badge_id' => '3', 'name' => 'Sprinter', 'description' => null, 'icon' => null, 'challenge_slug' => 'forest', 'awarded_at' => '2025-03-01 00:00:00'],
        ]);

        $data = json_decode((new BadgeController())->userBadges(self::USER_ID, $connection)->getContent(), true);

        $this->assertNull($data[0]['description']);
        $this->assertNull($data[0]['icon']);
    }
}
