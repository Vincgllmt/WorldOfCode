<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use App\Repository\SkillRepository;
use App\Mapper\SkillMapper;
use App\Enum\SkillCategory;
use OpenApi\Attributes as OA;
use Nelmio\ApiDocBundle\Attribute\Model;
use App\Dto\SkillResponse;

final class SkillController extends AbstractController
{
    public function __construct(
        private SkillRepository $repo,
        private SkillMapper $mapper
    ) {}

    #[Route('api/skills', name: 'skill_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste toutes les competences disponibles',
        description: 'Retourne la liste exhaustive des skills techniques, classees par categorie.',
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des competences',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: SkillResponse::class))
                )
            )
        ]
    )]
    #[OA\Tag(name: 'Skill')]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $skills = $this->repo->findAllOrderedByCategory();
        $data = array_map([$this->mapper, 'toDto'], $skills);

        return $this->json($data);
    }

    #[Route('api/skills/category/{category}', name: 'skill_list_by_category', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste les competences par categorie',
        description: 'Retourne les skills filtrees par categorie (language, frontend, backend, devops, design, etc.).',
        parameters: [
            new OA\Parameter(
                name: 'category',
                in: 'path',
                required: true,
                description: 'Categorie de competence',
                schema: new OA\Schema(type: 'string', enum: ['language', 'frontend', 'backend', 'mobile', 'database', 'devops', 'cloud', 'design', 'tools', 'testing', 'security', 'data', 'other'])
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Liste des competences de la categorie',
                content: new OA\JsonContent(
                    type: 'array',
                    items: new OA\Items(ref: new Model(type: SkillResponse::class))
                )
            ),
            new OA\Response(response: 400, description: 'Categorie invalide')
        ]
    )]
    #[OA\Tag(name: 'Skill')]
    public function listByCategory(string $category): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $skillCategory = SkillCategory::tryFrom($category);
        if (!$skillCategory) {
            return $this->json([
                'error' => 'Invalid category. Allowed: ' . implode(', ', SkillCategory::values())
            ], 400);
        }

        $skills = $this->repo->findByCategory($skillCategory);
        $data = array_map([$this->mapper, 'toDto'], $skills);

        return $this->json($data);
    }
}
