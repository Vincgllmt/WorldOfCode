<?php
namespace App\Controller;

use App\Dto\AdminGroupListItemDto;
use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use App\Repository\TechGroupRepository;
use App\Repository\TechWatchSourceRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Doctrine\ORM\EntityManagerInterface;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminGroupController extends AbstractController
{
    public function __construct(
        private TechGroupRepository $groupRepo,
        private TechWatchSourceRepository $techWatchSourceRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/groups', name: 'admin_groups_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste paginée des groupes pour l\'administration',
        parameters: [
            new OA\Parameter(name: 'page',      in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit',     in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'search',    in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortField', in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'sortDir',   in: 'query', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Liste paginée des groupes avec métriques'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $page      = max(1, (int) $request->query->get('page', 1));
        $limit     = min(100, max(1, (int) $request->query->get('limit', 20)));
        $search    = $request->query->get('search') ?: null;
        $sortField = $request->query->get('sortField', 'createdAt');
        $sortDir   = $request->query->get('sortDir', 'DESC');

        $result = $this->groupRepo->findPaginatedWithCounts(
            page: $page,
            limit: $limit,
            search: $search,
            sortField: $sortField,
            sortDir: $sortDir,
        );

        $items = array_map(fn($row) => new AdminGroupListItemDto(
            id: $row['id'],
            name: $row['name'],
            description: $row['description'] ?? null,
            memberCount: (int) $row['memberCount'],
            postCount: (int) $row['postCount'],
            creatorUsername: $row['creatorUsername'] ?? null,
            createdAt: $row['createdAt'] instanceof \DateTimeInterface
                ? $row['createdAt']->format(\DateTimeInterface::ATOM)
                : (string) $row['createdAt'],
            rssFeedUrl: $row['rssFeedUrl'] ?? null,
        ), $result['items']);

        return $this->json([
            'items' => $items,
            'total' => $result['total'],
            'page'  => $page,
            'limit' => $limit,
        ]);
    }

    #[Route('/groups', name: 'admin_groups_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer un nouveau groupe',
        responses: [
            new OA\Response(response: 201, description: 'Groupe créé'),
            new OA\Response(response: 400, description: 'Données invalides'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 422, description: 'URL RSS invalide'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim($data['name'] ?? '');

        if (strlen($name) < 2 || strlen($name) > 255) {
            return $this->json(['error' => 'Le nom doit contenir entre 2 et 255 caractères'], 400);
        }

        $rssFeedUrl = !empty($data['rssFeedUrl']) ? trim($data['rssFeedUrl']) : null;
        if ($rssFeedUrl !== null && !filter_var($rssFeedUrl, FILTER_VALIDATE_URL)) {
            return $this->json(['error' => 'URL RSS invalide'], 422);
        }

        $group = new TechGroup();
        $group->setName($name);
        $group->setDescription(!empty($data['description']) ? trim($data['description']) : null);
        $group->setCreator($this->getUser());
        $this->em->persist($group);

        if ($rssFeedUrl !== null) {
            $source = new TechWatchSource();
            $source->setFeedUrl($rssFeedUrl);
            $source->setName($name);
            $source->setTechGroup($group);
            $this->em->persist($source);
        }

        $this->em->flush();

        return $this->json(new AdminGroupListItemDto(
            id: $group->getId(),
            name: $group->getName(),
            description: $group->getDescription(),
            memberCount: 0,
            postCount: 0,
            creatorUsername: $this->getUser()?->getUserIdentifier(),
            createdAt: $group->getCreatedAt()->format(\DateTimeInterface::ATOM),
            rssFeedUrl: $rssFeedUrl,
        ), 201);
    }

    #[Route('/groups/{id}', name: 'admin_groups_update', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Mettre à jour un groupe',
        responses: [
            new OA\Response(response: 200, description: 'Groupe mis à jour'),
            new OA\Response(response: 400, description: 'Données invalides'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
            new OA\Response(response: 422, description: 'URL RSS invalide'),
        ]
    )]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->groupRepo->find($id);
        if (!$group) {
            return $this->json(['error' => 'Groupe non trouvé'], 404);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $name = trim($data['name'] ?? '');

        if (strlen($name) < 2 || strlen($name) > 255) {
            return $this->json(['error' => 'Le nom doit contenir entre 2 et 255 caractères'], 400);
        }

        $rssFeedUrl = array_key_exists('rssFeedUrl', $data)
            ? (!empty($data['rssFeedUrl']) ? trim($data['rssFeedUrl']) : null)
            : false; // false = not provided, don't touch RSS

        if ($rssFeedUrl !== false && $rssFeedUrl !== null && !filter_var($rssFeedUrl, FILTER_VALIDATE_URL)) {
            return $this->json(['error' => 'URL RSS invalide'], 422);
        }

        $group->setName($name);
        $group->setDescription(array_key_exists('description', $data)
            ? (!empty($data['description']) ? trim($data['description']) : null)
            : $group->getDescription());

        if ($rssFeedUrl !== false) {
            $existingSource = $this->techWatchSourceRepo->findOneBy(['techGroup' => $group]);

            if ($rssFeedUrl !== null) {
                if ($existingSource) {
                    $existingSource->setFeedUrl($rssFeedUrl);
                    $existingSource->setName($name);
                } else {
                    $source = new TechWatchSource();
                    $source->setFeedUrl($rssFeedUrl);
                    $source->setName($name);
                    $source->setTechGroup($group);
                    $this->em->persist($source);
                }
            } elseif ($existingSource) {
                $this->em->remove($existingSource);
            }
        } else {
            // Sync name on existing source even if rssFeedUrl not in payload
            $existingSource = $this->techWatchSourceRepo->findOneBy(['techGroup' => $group]);
            if ($existingSource) {
                $existingSource->setName($name);
            }
        }

        $this->em->flush();

        $finalSource = $this->techWatchSourceRepo->findOneBy(['techGroup' => $group]);

        return $this->json(new AdminGroupListItemDto(
            id: $group->getId(),
            name: $group->getName(),
            description: $group->getDescription(),
            memberCount: 0,
            postCount: 0,
            creatorUsername: $group->getCreator()?->getUserIdentifier(),
            createdAt: $group->getCreatedAt()->format(\DateTimeInterface::ATOM),
            rssFeedUrl: $finalSource?->getFeedUrl(),
        ));
    }

    #[Route('/groups/{id}', name: 'admin_groups_delete', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Supprimer un groupe',
        responses: [
            new OA\Response(response: 204, description: 'Groupe supprimé'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Groupe non trouvé'),
        ]
    )]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $group = $this->groupRepo->find($id);
        if (!$group) {
            return $this->json(['error' => 'Groupe non trouvé'], 404);
        }

        $this->em->remove($group);
        $this->em->flush();

        return $this->json(null, 204);
    }
}
