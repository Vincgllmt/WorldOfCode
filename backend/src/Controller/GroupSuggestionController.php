<?php

namespace App\Controller;

use App\Entity\GroupSuggestion;
use App\Repository\GroupSuggestionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/group-suggestions')]
#[OA\Tag(name: 'GroupSuggestion')]
class GroupSuggestionController extends AbstractController
{
    public function __construct(
        private GroupSuggestionRepository $suggestionRepo,
    ) {}

    #[Route('', name: 'group_suggestion_submit', methods: ['POST'])]
    #[OA\Post(
        summary: 'Soumettre une suggestion de groupe',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name'],
                properties: [
                    new OA\Property(property: 'name', type: 'string', example: 'Rust Developers'),
                    new OA\Property(property: 'description', type: 'string', nullable: true, example: 'Groupe dédié au langage Rust'),
                    new OA\Property(property: 'rssFeedUrl', type: 'string', nullable: true, example: 'https://example.com/feed.xml'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Suggestion créée'),
            new OA\Response(response: 400, description: 'Données invalides'),
            new OA\Response(response: 401, description: 'Non authentifié'),
        ]
    )]
    public function submit(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');

        $data = json_decode($request->getContent(), true);

        $name = trim($data['name'] ?? '');
        if ($name === '' || strlen($name) < 2 || strlen($name) > 255) {
            return $this->json(['error' => 'Le nom est requis (2-255 caractères).'], 400);
        }

        $description = isset($data['description']) && $data['description'] !== ''
            ? $data['description']
            : null;

        $rssFeedUrl = isset($data['rssFeedUrl']) && $data['rssFeedUrl'] !== ''
            ? $data['rssFeedUrl']
            : null;

        $suggestion = new GroupSuggestion();
        $suggestion->setSuggestedBy($this->getUser());
        $suggestion->setName($name);
        $suggestion->setDescription($description);
        $suggestion->setRssFeedUrl($rssFeedUrl);

        $this->suggestionRepo->save($suggestion);

        return $this->json([
            'id'     => $suggestion->getId(),
            'name'   => $suggestion->getName(),
            'status' => $suggestion->getStatus()->value,
        ], 201);
    }
}
