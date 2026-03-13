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
     * @return array<int, array{user: User, score: float, sharedSkills: string[], sharedGroups: string[], mutualFollowsCount: int}>
     */
    public function getSuggestedUsers(User $currentUser, int $limit = 5, int $offset = 0): array
    {
        $userId = $currentUser->getId();
        $cacheKey = "user_suggestions_{$userId}_{$limit}_{$offset}";

        return $this->cache->get($cacheKey, function (ItemInterface $item) use ($currentUser, $limit, $offset) {
            $item->expiresAfter(1800);
            return $this->computeUserSuggestions($currentUser, $limit, $offset);
        });
    }

    public function invalidateUserCache(int $userId): void
    {
        // Invalider les cles courantes
        foreach ([5, 20] as $limit) {
            for ($offset = 0; $offset <= 100; $offset += 5) {
                $this->cache->delete("user_suggestions_{$userId}_{$limit}_{$offset}");
            }
        }
    }

    /**
     * @return array<int, array{user: User, score: float, sharedSkills: string[], sharedGroups: string[], mutualFollowsCount: int}>
     */
    private function computeUserSuggestions(User $currentUser, int $limit, int $offset = 0): array
    {
        $currentId = $currentUser->getId();
        $conn = $this->em->getConnection();

        // Recuperer skills et groupes directement en SQL (evite les problemes de lazy loading)
        $mySkillIds = $conn->fetchFirstColumn(
            "SELECT skill_id FROM user_skill WHERE user_id = :uid",
            ["uid" => $currentId]
        );
        $myGroupIds = $conn->fetchFirstColumn(
            "SELECT tech_group_id FROM techgroup_user WHERE user_id = :uid",
            ["uid" => $currentId]
        );
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
            return $this->fallbackPopularUsers($excludeIds, $limit, $offset);
        }

        // Construction de la requete de scoring
        $params = ["currentId" => $currentId];

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
            SELECT * FROM (
                SELECT u.id,
                    (COALESCE(sk.shared_skills, 0) * 3
                     + COALESCE(gr.shared_groups, 0) * 2
                     + COALESCE(mf.mutual_follows, 0) * 2
                     + {$locationCase}
                     + {$availabilityCase}
                     + CASE WHEN u.bio IS NOT NULL AND u.avatar_url IS NOT NULL THEN 0.5 ELSE 0 END
                    ) AS score,
                    COALESCE(sk.shared_skills, 0) AS shared_skills_count,
                    COALESCE(gr.shared_groups, 0) AS shared_groups_count,
                    COALESCE(mf.mutual_follows, 0) AS mutual_follows_count
                FROM user u
                {$skillJoin}
                {$groupJoin}
                {$mutualJoin}
                WHERE u.id NOT IN ({$inExclude})
            ) ranked
            WHERE score > 0
            ORDER BY score DESC
            LIMIT {$limit}
            OFFSET {$offset}
        ";

        $rows = $conn->fetchAllAssociative($sql, $params);

        if (empty($rows)) {
            if ($offset === 0) {
                return $this->fallbackPopularUsers($excludeIds, $limit, 0);
            }
            return [];
        }

        $userIds = array_column($rows, "id");
        $scoreMap = [];
        $countsMap = [];
        foreach ($rows as $row) {
            $id = (int) $row["id"];
            $scoreMap[$id] = (float) $row["score"];
            $countsMap[$id] = [
                "sharedSkillsCount" => (int) $row["shared_skills_count"],
                "sharedGroupsCount" => (int) $row["shared_groups_count"],
                "mutualFollowsCount" => (int) $row["mutual_follows_count"],
            ];
        }

        // Recuperer les noms des skills en commun par user
        $sharedSkillsMap = $this->fetchSharedSkillNames($mySkillIds, $userIds);

        // Recuperer les noms des groupes en commun par user
        $sharedGroupsMap = $this->fetchSharedGroupNames($myGroupIds, $userIds);

        $users = $this->userRepository->findBy(["id" => $userIds]);

        // Trier dans l'ordre du score
        usort($users, fn(User $a, User $b) => ($scoreMap[$b->getId()] ?? 0) <=> ($scoreMap[$a->getId()] ?? 0));

        return array_map(fn(User $u) => [
            "user" => $u,
            "score" => $scoreMap[$u->getId()] ?? 0,
            "sharedSkills" => $sharedSkillsMap[$u->getId()] ?? [],
            "sharedGroups" => $sharedGroupsMap[$u->getId()] ?? [],
            "mutualFollowsCount" => $countsMap[$u->getId()]["mutualFollowsCount"] ?? 0,
        ], $users);
    }

    /**
     * @param int[] $mySkillIds
     * @param int[] $userIds
     * @return array<int, string[]>
     */
    private function fetchSharedSkillNames(array $mySkillIds, array $userIds): array
    {
        if (empty($mySkillIds) || empty($userIds)) {
            return [];
        }

        $conn = $this->em->getConnection();
        $params = [];

        $skillPlaceholders = [];
        foreach ($mySkillIds as $i => $sid) {
            $key = "fsk_{$i}";
            $skillPlaceholders[] = ":{$key}";
            $params[$key] = $sid;
        }

        $userPlaceholders = [];
        foreach ($userIds as $i => $uid) {
            $key = "fsu_{$i}";
            $userPlaceholders[] = ":{$key}";
            $params[$key] = $uid;
        }

        $sql = "
            SELECT us2.user_id, s.name
            FROM user_skill us2
            JOIN skill s ON s.id = us2.skill_id
            WHERE us2.skill_id IN (" . implode(",", $skillPlaceholders) . ")
            AND us2.user_id IN (" . implode(",", $userPlaceholders) . ")
        ";

        $rows = $conn->fetchAllAssociative($sql, $params);

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row["user_id"]][] = $row["name"];
        }

        return $map;
    }

    /**
     * @param int[] $myGroupIds
     * @param int[] $userIds
     * @return array<int, string[]>
     */
    private function fetchSharedGroupNames(array $myGroupIds, array $userIds): array
    {
        if (empty($myGroupIds) || empty($userIds)) {
            return [];
        }

        $conn = $this->em->getConnection();
        $params = [];

        $groupPlaceholders = [];
        foreach ($myGroupIds as $i => $gid) {
            $key = "fgr_{$i}";
            $groupPlaceholders[] = ":{$key}";
            $params[$key] = $gid;
        }

        $userPlaceholders = [];
        foreach ($userIds as $i => $uid) {
            $key = "fgu_{$i}";
            $userPlaceholders[] = ":{$key}";
            $params[$key] = $uid;
        }

        $sql = "
            SELECT tu.user_id, tg.name
            FROM techgroup_user tu
            JOIN tech_group tg ON tg.id = tu.tech_group_id
            WHERE tu.tech_group_id IN (" . implode(",", $groupPlaceholders) . ")
            AND tu.user_id IN (" . implode(",", $userPlaceholders) . ")
        ";

        $rows = $conn->fetchAllAssociative($sql, $params);

        $map = [];
        foreach ($rows as $row) {
            $map[(int) $row["user_id"]][] = $row["name"];
        }

        return $map;
    }

    /**
     * @param int[] $excludeIds
     * @return array<int, array{user: User, score: float, sharedSkills: string[], sharedGroups: string[], mutualFollowsCount: int}>
     */
    private function fallbackPopularUsers(array $excludeIds, int $limit, int $offset = 0): array
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
            OFFSET {$offset}
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
            "sharedSkills" => [],
            "sharedGroups" => [],
            "mutualFollowsCount" => 0,
        ], $users);
    }
}
