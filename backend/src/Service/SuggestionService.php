<?php

namespace App\Service;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class SuggestionService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        #[Autowire(service: "cache.suggestions")]
        private readonly CacheInterface $cache,
    ) {}

    /**
     * @return array<int, array{user: User, score: float}>
     */
    public function getSuggestedUsers(User $currentUser, int $limit = 5): array
    {
        $userId = $currentUser->getId();
        $cacheKey = "user_suggestions_{$userId}_{$limit}";

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($currentUser, $limit) {
            $item->expiresAfter(1800);
            return $this->computeUserSuggestions($currentUser, $limit);
        });
    }

    public function invalidateUserCache(int $userId): void
    {
        $this->cache->delete("user_suggestions_{$userId}_5");
        $this->cache->delete("user_suggestions_{$userId}_20");
    }

    /**
     * @return array<int, array{user: User, score: float}>
     */
    private function computeUserSuggestions(User $currentUser, int $limit): array
    {
        $currentId = $currentUser->getId();
        $conn = $this->em->getConnection();

        $mySkillIds = array_map(fn($s) => $s->getId(), $currentUser->getSkills()->toArray());
        $myGroupIds = array_map(fn($g) => $g->getId(), $currentUser->getJoinedGroups()->toArray());
        $myLocation = $currentUser->getLocation();
        $myAvailability = $currentUser->getAvailability()?->value;

        // IDs a exclure : moi + ceux que je suis deja
        $followedRows = $conn->fetchFirstColumn(
            "SELECT followed_id FROM follows WHERE follower_id = :me",
            ["me" => $currentId]
        );
        $excludeIds = array_merge([$currentId], $followedRows);

        // Si profil vide, fallback vers les utilisateurs les plus suivis
        if (empty($mySkillIds) && empty($myGroupIds) && empty($myLocation)) {
            return $this->fallbackPopularUsers($excludeIds, $limit);
        }

        // Construction de la requete de scoring
        $params = ["currentId" => $currentId];
        $types = [];

        // Sous-requete skills
        $skillJoin = "LEFT JOIN (SELECT 0 AS user_id, 0 AS shared_skills WHERE 1=0) sk ON sk.user_id = u.id";
        if (!empty($mySkillIds)) {
            $skillPlaceholders = [];
            foreach ($mySkillIds as $i => $sid) {
                $key = "sk_{$i}";
                $skillPlaceholders[] = ":{$key}";
                $params[$key] = $sid;
            }
            $inSkills = implode(",", $skillPlaceholders);
            $skillJoin = "LEFT JOIN (SELECT us2.user_id, COUNT(*) AS shared_skills FROM user_skill us2 WHERE us2.skill_id IN ({$inSkills}) GROUP BY us2.user_id) sk ON sk.user_id = u.id";
        }

        // Sous-requete groupes
        $groupJoin = "LEFT JOIN (SELECT 0 AS user_id, 0 AS shared_groups WHERE 1=0) gr ON gr.user_id = u.id";
        if (!empty($myGroupIds)) {
            $groupPlaceholders = [];
            foreach ($myGroupIds as $i => $gid) {
                $key = "gr_{$i}";
                $groupPlaceholders[] = ":{$key}";
                $params[$key] = $gid;
            }
            $inGroups = implode(",", $groupPlaceholders);
            $groupJoin = "LEFT JOIN (SELECT tu.user_id, COUNT(*) AS shared_groups FROM techgroup_user tu WHERE tu.tech_group_id IN ({$inGroups}) GROUP BY tu.user_id) gr ON gr.user_id = u.id";
        }

        // Sous-requete followers mutuels
        $mutualJoin = "LEFT JOIN (SELECT f2.followed_id AS user_id, COUNT(*) AS mutual_follows FROM follows f1 JOIN follows f2 ON f1.followed_id = f2.follower_id WHERE f1.follower_id = :currentId AND f2.followed_id != :currentId GROUP BY f2.followed_id) mf ON mf.user_id = u.id";

        // Exclusions
        $excludePlaceholders = [];
        foreach ($excludeIds as $i => $eid) {
            $key = "ex_{$i}";
            $excludePlaceholders[] = ":{$key}";
            $params[$key] = $eid;
        }
        $inExclude = implode(",", $excludePlaceholders);

        // Conditions location et availability
        $locationCase = "0";
        if ($myLocation) {
            $locationCase = "CASE WHEN u.location IS NOT NULL AND LOWER(u.location) = LOWER(:myLocation) THEN 1 ELSE 0 END";
            $params["myLocation"] = $myLocation;
        }

        $availabilityCase = "0";
        if ($myAvailability) {
            $availabilityCase = "CASE WHEN u.availability IS NOT NULL AND u.availability = :myAvailability THEN 1 ELSE 0 END";
            $params["myAvailability"] = $myAvailability;
        }

        $sql = "
            SELECT u.id,
                (COALESCE(sk.shared_skills, 0) * 3
                 + COALESCE(gr.shared_groups, 0) * 2
                 + COALESCE(mf.mutual_follows, 0) * 2
                 + {$locationCase}
                 + {$availabilityCase}
                 + CASE WHEN u.bio IS NOT NULL AND u.avatar_url IS NOT NULL THEN 0.5 ELSE 0 END
                ) AS score
            FROM user u
            {$skillJoin}
            {$groupJoin}
            {$mutualJoin}
            WHERE u.id NOT IN ({$inExclude})
            HAVING score > 0
            ORDER BY score DESC
            LIMIT {$limit}
        ";

        $rows = $conn->fetchAllAssociative($sql, $params);

        if (empty($rows)) {
            return $this->fallbackPopularUsers($excludeIds, $limit);
        }

        $userIds = array_column($rows, "id");
        $scoreMap = [];
        foreach ($rows as $row) {
            $scoreMap[(int) $row["id"]] = (float) $row["score"];
        }

        $users = $this->userRepository->findBy(["id" => $userIds]);

        // Trier dans l'ordre du score
        usort($users, fn(User $a, User $b) => ($scoreMap[$b->getId()] ?? 0) <=> ($scoreMap[$a->getId()] ?? 0));

        return array_map(fn(User $u) => [
            "user" => $u,
            "score" => $scoreMap[$u->getId()] ?? 0,
        ], $users);
    }

    /**
     * @param int[] $excludeIds
     * @return array<int, array{user: User, score: float}>
     */
    private function fallbackPopularUsers(array $excludeIds, int $limit): array
    {
        $conn = $this->em->getConnection();

        $params = [];
        $excludePlaceholders = [];
        foreach ($excludeIds as $i => $eid) {
            $key = "fb_{$i}";
            $excludePlaceholders[] = ":{$key}";
            $params[$key] = $eid;
        }
        $inExclude = implode(",", $excludePlaceholders);

        $sql = "
            SELECT u.id, COUNT(f.id) AS follower_count
            FROM user u
            LEFT JOIN follows f ON f.followed_id = u.id
            WHERE u.id NOT IN ({$inExclude})
            GROUP BY u.id
            ORDER BY follower_count DESC
            LIMIT {$limit}
        ";

        $rows = $conn->fetchAllAssociative($sql, $params);

        if (empty($rows)) {
            return [];
        }

        $userIds = array_column($rows, "id");
        $users = $this->userRepository->findBy(["id" => $userIds]);

        return array_map(fn(User $u) => [
            "user" => $u,
            "score" => 0.0,
        ], $users);
    }
}
