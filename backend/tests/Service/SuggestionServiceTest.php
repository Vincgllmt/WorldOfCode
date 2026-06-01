<?php

namespace App\Tests\Service;

use App\Entity\Follow;
use App\Entity\Skill;
use App\Entity\TechGroup;
use App\Entity\User;
use App\Enum\Availability;
use App\Enum\SkillCategory;
use App\Service\SuggestionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

/**
 * 🎮 Hollow Knight - Tests du SuggestionService (algo de matching)
 *
 * TheKnight      = utilisateur connecte (celui qui cherche des suggestions)
 * Hornet         = utilisateur avec beaucoup en commun (skills + groupes + location)
 * Quirrel        = utilisateur avec quelques skills en commun
 * Zote           = utilisateur sans rien en commun
 * Grimm          = utilisateur deja suivi (doit etre exclu)
 * BrokenVessel   = utilisateur intermediaire pour les follows mutuels
 */
class SuggestionServiceTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private SuggestionService $service;

    protected function setUp(): void
    {
        self::bootKernel();
        $container = static::getContainer();

        $this->em = $container->get(EntityManagerInterface::class);
        $this->service = $container->get(SuggestionService::class);

        // Nettoyer la base entre chaque test
        $conn = $this->em->getConnection();
        $conn->executeStatement('DELETE FROM follows');
        $conn->executeStatement('DELETE FROM user_skill');
        $conn->executeStatement('DELETE FROM techgroup_user');
        $conn->executeStatement('DELETE FROM user');
        $conn->executeStatement('DELETE FROM skill');
        $conn->executeStatement('DELETE FROM tech_group');
    }

    // ========== HELPERS ==========

    private function createUser(string $username, ?string $location = null, ?Availability $availability = null, ?string $bio = null, ?string $avatarUrl = null): User
    {
        $user = new User();
        $user->setUsername($username);
        $user->setEmail("{$username}@hallownest.bug");
        $user->setPassword('VoidHeart!@2024');
        $user->setFirstname($username);
        $user->setLastname('OfHallownest');
        if ($location) $user->setLocation($location);
        if ($availability) $user->setAvailability($availability);
        if ($bio) $user->setBio($bio);
        if ($avatarUrl) $user->setAvatarUrl($avatarUrl);

        $this->em->persist($user);
        return $user;
    }

    private function createSkill(string $name, SkillCategory $category = SkillCategory::LANGUAGE): Skill
    {
        $skill = new Skill();
        $skill->setName($name);
        $skill->setCategory($category);
        $this->em->persist($skill);
        return $skill;
    }

    private function createGroup(string $name): TechGroup
    {
        $group = new TechGroup();
        $group->setName($name);
        $group->setDescription("Groupe {$name}");
        $this->em->persist($group);
        return $group;
    }

    private function createFollow(User $follower, User $followed): Follow
    {
        $follow = new Follow();
        $follow->setFollower($follower);
        $follow->setFollowed($followed);
        $this->em->persist($follow);
        return $follow;
    }

    // ========== TESTS OK ==========

    /**
     * Un user avec 3 skills en commun doit avoir un score de 9 (3 skills x3)
     */
    public function testScoringSharedSkillsReturnCorrectScore(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $php = $this->createSkill('PHP', SkillCategory::BACKEND);
        $docker = $this->createSkill('Docker', SkillCategory::DEVOPS);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($react);
        $knight->addSkill($php);
        $knight->addSkill($docker);

        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($react);
        $hornet->addSkill($php);
        $hornet->addSkill($docker);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        $this->assertSame($hornet->getId(), $results[0]['user']->getId());
        $this->assertEquals(9.0, $results[0]['score']); // 3 skills * 3
        $this->assertCount(3, $results[0]['sharedSkills']);
    }

    /**
     * Un user avec 2 groupes en commun doit avoir un score de 4 (2 groupes x2)
     */
    public function testScoringSharedGroupsReturnCorrectScore(): void
    {
        $frontend = $this->createGroup('Frontend Club');
        $devops = $this->createGroup('DevOps Guild');

        $knight = $this->createUser('TheKnight');
        $knight->addJoinedGroup($frontend);
        $knight->addJoinedGroup($devops);

        $quirrel = $this->createUser('Quirrel');
        $quirrel->addJoinedGroup($frontend);
        $quirrel->addJoinedGroup($devops);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        $this->assertSame($quirrel->getId(), $results[0]['user']->getId());
        $this->assertEquals(4.0, $results[0]['score']); // 2 groupes * 2
        $this->assertCount(2, $results[0]['sharedGroups']);
    }

    /**
     * La localisation identique doit ajouter 1 point au score
     */
    public function testScoringLocationMatchAddsOnePoint(): void
    {
        // Il faut au moins un skill/groupe sinon on tombe dans le fallback
        $skill = $this->createSkill('Nail', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight', 'Dirtmouth');
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet', 'Dirtmouth');
        $hornet->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 1 skill en commun (x3) + meme location (x1) = 4
        $this->assertEquals(4.0, $results[0]['score']);
    }

    /**
     * La meme disponibilite doit ajouter 1 point au score
     */
    public function testScoringAvailabilityMatchAddsOnePoint(): void
    {
        $skill = $this->createSkill('Soul', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->setAvailability(Availability::OPEN_TO_WORK);
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet');
        $hornet->setAvailability(Availability::OPEN_TO_WORK);
        $hornet->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 1 skill (x3) + meme availability (x1) = 4
        $this->assertEquals(4.0, $results[0]['score']);
    }

    /**
     * Un profil complet (bio + avatar) doit ajouter 0.5 point
     */
    public function testScoringCompleteProfileAddsHalfPoint(): void
    {
        $skill = $this->createSkill('Void', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet', null, null, 'Protectrice de Hallownest', 'https://hollow.png');
        $hornet->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 1 skill (x3) + profil complet (x0.5) = 3.5
        $this->assertEquals(3.5, $results[0]['score']);
    }

    /**
     * Le score cumule toutes les dimensions : skills + groupes + location + availability + profil complet
     */
    public function testScoringCumulatesAllDimensions(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $php = $this->createSkill('PHP', SkillCategory::BACKEND);
        $group = $this->createGroup('WebDev');

        $knight = $this->createUser('TheKnight', 'Dirtmouth');
        $knight->setAvailability(Availability::FREELANCE);
        $knight->addSkill($react);
        $knight->addSkill($php);
        $knight->addJoinedGroup($group);

        $hornet = $this->createUser('Hornet', 'Dirtmouth', Availability::FREELANCE, 'Bio ici', 'https://avatar.png');
        $hornet->addSkill($react);
        $hornet->addSkill($php);
        $hornet->addJoinedGroup($group);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 2 skills (x3=6) + 1 groupe (x2=2) + location (1) + availability (1) + profil complet (0.5) = 10.5
        $this->assertEquals(10.5, $results[0]['score']);
    }

    /**
     * Les resultats doivent etre tries par score decroissant
     */
    public function testResultsAreSortedByScoreDescending(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $php = $this->createSkill('PHP', SkillCategory::BACKEND);
        $docker = $this->createSkill('Docker', SkillCategory::DEVOPS);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($react);
        $knight->addSkill($php);
        $knight->addSkill($docker);

        // Hornet a 3 skills en commun -> score 9
        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($react);
        $hornet->addSkill($php);
        $hornet->addSkill($docker);

        // Quirrel a 1 skill en commun -> score 3
        $quirrel = $this->createUser('Quirrel');
        $quirrel->addSkill($react);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(2, $results);
        $this->assertSame($hornet->getId(), $results[0]['user']->getId());
        $this->assertSame($quirrel->getId(), $results[1]['user']->getId());
        $this->assertGreaterThan($results[1]['score'], $results[0]['score']);
    }

    /**
     * Les noms des skills en commun doivent etre retournes
     */
    public function testSharedSkillNamesAreReturned(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $php = $this->createSkill('PHP', SkillCategory::BACKEND);
        $go = $this->createSkill('Go', SkillCategory::BACKEND);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($react);
        $knight->addSkill($php);

        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($react);
        $hornet->addSkill($php);
        $hornet->addSkill($go); // Go n'est pas en commun

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        $sharedSkills = $results[0]['sharedSkills'];
        $this->assertCount(2, $sharedSkills);
        $this->assertContains('React', $sharedSkills);
        $this->assertContains('PHP', $sharedSkills);
        $this->assertNotContains('Go', $sharedSkills);
    }

    /**
     * Les noms des groupes en commun doivent etre retournes
     */
    public function testSharedGroupNamesAreReturned(): void
    {
        $frontend = $this->createGroup('Frontend Club');
        $backend = $this->createGroup('Backend Guild');

        $knight = $this->createUser('TheKnight');
        $knight->addJoinedGroup($frontend);
        $knight->addJoinedGroup($backend);

        $quirrel = $this->createUser('Quirrel');
        $quirrel->addJoinedGroup($frontend);
        // Quirrel n'est pas dans Backend Guild

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        $sharedGroups = $results[0]['sharedGroups'];
        $this->assertCount(1, $sharedGroups);
        $this->assertContains('Frontend Club', $sharedGroups);
    }

    /**
     * Le parametre limit doit limiter le nombre de resultats
     */
    public function testLimitRestrictsNumberOfResults(): void
    {
        $skill = $this->createSkill('Nail', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        // Creer 5 users avec le skill en commun
        for ($i = 1; $i <= 5; $i++) {
            $u = $this->createUser("Bug{$i}");
            $u->addSkill($skill);
        }

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 2, 0);

        $this->assertCount(2, $results);
    }

    /**
     * Le parametre offset doit sauter les premiers resultats
     */
    public function testOffsetSkipsFirstResults(): void
    {
        $skill = $this->createSkill('Nail', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        for ($i = 1; $i <= 5; $i++) {
            $u = $this->createUser("Bug{$i}");
            $u->addSkill($skill);
        }

        $this->em->flush();

        $page1 = $this->service->getSuggestedUsers($knight, 3, 0);
        $page2 = $this->service->getSuggestedUsers($knight, 3, 3);

        $this->assertCount(3, $page1);
        $this->assertCount(2, $page2);

        // Verifier qu'il n'y a pas d'overlap
        $idsPage1 = array_map(fn($r) => $r['user']->getId(), $page1);
        $idsPage2 = array_map(fn($r) => $r['user']->getId(), $page2);
        $this->assertEmpty(array_intersect($idsPage1, $idsPage2));
    }

    /**
     * Quand l'offset dépasse la quantité de résultats disponibles ET qu'il
     * est > 0, la méthode doit retourner un tableau vide (sans fallback).
     */
    public function testReturnsEmptyArrayWhenOffsetExceedsAvailableResults(): void
    {
        $skill = $this->createSkill('Lifeblood', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        // Seulement 2 utilisateurs avec le skill partagé
        for ($i = 1; $i <= 2; $i++) {
            $u = $this->createUser("Husk{$i}");
            $u->addSkill($skill);
        }

        $this->em->flush();

        // Offset = 10 → bien au-delà des 2 résultats existants → tableau vide
        $results = $this->service->getSuggestedUsers($knight, 5, 10);

        $this->assertSame([], $results);
    }

    // ========== TESTS NOK (exclusions) ==========

    /**
     * L'utilisateur connecte ne doit jamais apparaitre dans ses propres suggestions
     */
    public function testCurrentUserIsExcludedFromResults(): void
    {
        $skill = $this->createSkill('Void', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $ids = array_map(fn($r) => $r['user']->getId(), $results);
        $this->assertNotContains($knight->getId(), $ids);
    }

    /**
     * Un utilisateur deja suivi ne doit pas apparaitre dans les suggestions
     */
    public function testFollowedUsersAreExcluded(): void
    {
        $skill = $this->createSkill('Shade', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        $grimm = $this->createUser('Grimm');
        $grimm->addSkill($skill);

        // TheKnight suit deja Grimm
        $this->createFollow($knight, $grimm);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $ids = array_map(fn($r) => $r['user']->getId(), $results);
        $this->assertNotContains($grimm->getId(), $ids);
    }

    /**
     * Un utilisateur sans rien en commun (score = 0) ne doit pas apparaitre
     */
    public function testUserWithNoSharedPreferencesIsNotSuggested(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $go = $this->createSkill('Go', SkillCategory::BACKEND);

        $knight = $this->createUser('TheKnight', 'Dirtmouth');
        $knight->addSkill($react);

        // Hornet partage React → score > 0, evite le fallback
        $hornet = $this->createUser('Hornet', 'Greenpath');
        $hornet->addSkill($react);

        // Zote n'a ni React, ni la meme location → score = 0
        $zote = $this->createUser('Zote', 'Colosseum');
        $zote->addSkill($go);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $ids = array_map(fn($r) => $r['user']->getId(), $results);
        $this->assertContains($hornet->getId(), $ids, 'Hornet devrait apparaitre (skill en commun)');
        $this->assertNotContains($zote->getId(), $ids, 'Zote ne devrait pas apparaitre (rien en commun)');
    }

    /**
     * Un profil vide (pas de skills, groupes, ni location) doit retourner le fallback (users populaires)
     */
    public function testEmptyProfileReturnsFallbackPopularUsers(): void
    {
        $knight = $this->createUser('TheKnight');

        // Creer des users avec des followers
        $hornet = $this->createUser('Hornet');
        $quirrel = $this->createUser('Quirrel');

        // Hornet a 2 followers, Quirrel en a 1
        $follower1 = $this->createUser('Follower1');
        $follower2 = $this->createUser('Follower2');
        $this->createFollow($follower1, $hornet);
        $this->createFollow($follower2, $hornet);
        $this->createFollow($follower1, $quirrel);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        // Doit retourner des users (fallback), tous avec score 0
        $this->assertNotEmpty($results);
        foreach ($results as $result) {
            $this->assertEquals(0.0, $result['score']);
            $this->assertEmpty($result['sharedSkills']);
            $this->assertEmpty($result['sharedGroups']);
            $this->assertEquals(0, $result['mutualFollowsCount']);
        }
    }

    /**
     * Les followers mutuels (amis d'amis) doivent ajouter 2 points par mutual
     */
    public function testScoringMutualFollowsAddsPoints(): void
    {
        $skill = $this->createSkill('Geo', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($skill);

        // BrokenVessel est un "ami commun" : TheKnight suit BrokenVessel, et BrokenVessel suit Hornet
        $brokenVessel = $this->createUser('BrokenVessel');

        $this->createFollow($knight, $brokenVessel);    // TheKnight -> BrokenVessel
        $this->createFollow($brokenVessel, $hornet);     // BrokenVessel -> Hornet

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        // Trouver Hornet dans les resultats
        $hornetResult = null;
        foreach ($results as $r) {
            if ($r['user']->getId() === $hornet->getId()) {
                $hornetResult = $r;
                break;
            }
        }

        $this->assertNotNull($hornetResult, 'Hornet devrait apparaitre dans les suggestions');
        // 1 skill (x3=3) + 1 mutual follow (x2=2) = 5
        $this->assertEquals(5.0, $hornetResult['score']);
        $this->assertEquals(1, $hornetResult['mutualFollowsCount']);
    }

    /**
     * Plusieurs mutual follows doivent chacun ajouter 2 points
     */
    public function testScoringMultipleMutualFollowsAddsPoints(): void
    {
        $skill = $this->createSkill('Geo', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($skill);

        // 3 amis communs
        $vessel1 = $this->createUser('BrokenVessel');
        $vessel2 = $this->createUser('LostKin');
        $vessel3 = $this->createUser('Nosk');

        $this->createFollow($knight, $vessel1);
        $this->createFollow($vessel1, $hornet);
        $this->createFollow($knight, $vessel2);
        $this->createFollow($vessel2, $hornet);
        $this->createFollow($knight, $vessel3);
        $this->createFollow($vessel3, $hornet);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $hornetResult = null;
        foreach ($results as $r) {
            if ($r['user']->getId() === $hornet->getId()) {
                $hornetResult = $r;
                break;
            }
        }

        $this->assertNotNull($hornetResult);
        // 1 skill (x3=3) + 3 mutual follows (x2=6) = 9
        $this->assertEquals(9.0, $hornetResult['score']);
        $this->assertEquals(3, $hornetResult['mutualFollowsCount']);
    }

    /**
     * Un user avec skills ET groupes en commun doit retourner les deux listes
     */
    public function testCombinedSkillsAndGroupsReturnsBothLists(): void
    {
        $react = $this->createSkill('React', SkillCategory::FRONTEND);
        $php = $this->createSkill('PHP', SkillCategory::BACKEND);
        $frontend = $this->createGroup('Frontend Club');

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($react);
        $knight->addSkill($php);
        $knight->addJoinedGroup($frontend);

        $hornet = $this->createUser('Hornet');
        $hornet->addSkill($react);
        $hornet->addSkill($php);
        $hornet->addJoinedGroup($frontend);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 2 skills (x3=6) + 1 groupe (x2=2) = 8
        $this->assertEquals(8.0, $results[0]['score']);
        $this->assertCount(2, $results[0]['sharedSkills']);
        $this->assertContains('React', $results[0]['sharedSkills']);
        $this->assertContains('PHP', $results[0]['sharedSkills']);
        $this->assertCount(1, $results[0]['sharedGroups']);
        $this->assertContains('Frontend Club', $results[0]['sharedGroups']);
    }

    /**
     * Deux users avec des disponibilites differentes ne doivent PAS avoir le bonus availability
     */
    public function testDifferentAvailabilityGivesNoBonus(): void
    {
        $skill = $this->createSkill('Charm', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->setAvailability(Availability::OPEN_TO_WORK);
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet');
        $hornet->setAvailability(Availability::FREELANCE);
        $hornet->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 1 skill (x3=3) seulement, pas de bonus availability
        $this->assertEquals(3.0, $results[0]['score']);
    }

    /**
     * Deux users avec des locations differentes ne doivent PAS avoir le bonus location
     */
    public function testDifferentLocationGivesNoBonus(): void
    {
        $skill = $this->createSkill('Spell', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight', 'Dirtmouth');
        $knight->addSkill($skill);

        $hornet = $this->createUser('Hornet', 'Greenpath');
        $hornet->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        $this->assertCount(1, $results);
        // 1 skill (x3=3) seulement, pas de bonus location
        $this->assertEquals(3.0, $results[0]['score']);
    }

    /**
     * Un profil avec bio mais sans avatar (ou inversement) ne doit PAS avoir le bonus 0.5
     */
    public function testIncompleteProfileGivesNoBonus(): void
    {
        $skill = $this->createSkill('Mask', SkillCategory::OTHER);

        $knight = $this->createUser('TheKnight');
        $knight->addSkill($skill);

        // Quirrel a une bio mais pas d'avatar
        $quirrel = $this->createUser('Quirrel', null, null, 'Erudit de Hallownest', null);
        $quirrel->addSkill($skill);

        // Zote a un avatar mais pas de bio
        $zote = $this->createUser('Zote', null, null, null, 'https://zote.png');
        $zote->addSkill($skill);

        $this->em->flush();

        $results = $this->service->getSuggestedUsers($knight, 5, 0);

        // Les deux doivent avoir score 3.0 (1 skill x3), sans bonus profil
        foreach ($results as $result) {
            $this->assertEquals(3.0, $result['score'], $result['user']->getUsername() . ' ne devrait pas avoir le bonus profil complet');
        }
    }
}
