<?php

namespace App\Controller;

use App\Entity\TechGroup;
use App\Entity\TechWatchSource;
use App\Enum\SuggestionStatus;
use App\Repository\GroupSuggestionRepository;
use App\Repository\TechGroupRepository;
use App\Repository\TechWatchSourceRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin/group-suggestions')]
#[OA\Tag(name: 'Admin - GroupSuggestion')]
class AdminGroupSuggestionController extends AbstractController
{
    public function __construct(
        private GroupSuggestionRepository $suggestionRepo,
        private TechGroupRepository       $techGroupRepo,
        private TechWatchSourceRepository $techWatchSourceRepo,
    ) {}

    #[Route('', name: 'admin_group_suggestion_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste toutes les suggestions de groupes (admin)',
        responses: [
            new OA\Response(response: 200, description: 'Liste des suggestions'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $suggestions = $this->suggestionRepo->findAll();

        $data = array_map(function ($s) {
            return [
                'id'             => $s->getId(),
                'name'           => $s->getName(),
                'description'    => $s->getDescription(),
                'rssFeedUrl'     => $s->getRssFeedUrl(),
                'status'         => $s->getStatus()->value,
                'suggestedBy'    => [
                    'id'       => $s->getSuggestedBy()->getId(),
                    'username' => $s->getSuggestedBy()->getUsername(),
                ],
                'claimedBy'      => $s->getClaimedBy() ? [
                    'id'       => $s->getClaimedBy()->getId(),
                    'username' => $s->getClaimedBy()->getUsername(),
                ] : null,
                'claimedAt'      => $s->getClaimedAt()?->format(\DateTime::ATOM),
                'approvedBy'     => $s->getApprovedBy() ? [
                    'id'       => $s->getApprovedBy()->getId(),
                    'username' => $s->getApprovedBy()->getUsername(),
                ] : null,
                'approvedAt'     => $s->getApprovedAt()?->format(\DateTime::ATOM),
                'rejectedBy'     => $s->getRejectedBy() ? [
                    'id'       => $s->getRejectedBy()->getId(),
                    'username' => $s->getRejectedBy()->getUsername(),
                ] : null,
                'rejectedAt'     => $s->getRejectedAt()?->format(\DateTime::ATOM),
                'resolutionNote' => $s->getResolutionNote(),
                'createdAt'      => $s->getCreatedAt()->format(\DateTime::ATOM),
            ];
        }, $suggestions);

        return $this->json($data, 200);
    }

    #[Route('/{id}/claim', name: 'admin_group_suggestion_claim', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Prendre en charge une suggestion (claim)',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Suggestion prise en charge'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Suggestion non trouvée'),
            new OA\Response(response: 409, description: 'Déjà prise en charge par un autre admin'),
        ]
    )]
    public function claim(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $suggestion = $this->suggestionRepo->find($id);
        if (!$suggestion) {
            return $this->json(['error' => 'Suggestion non trouvée.'], 404);
        }

        if ($suggestion->getStatus() === SuggestionStatus::IN_PROGRESS) {
            $claimedBy = $suggestion->getClaimedBy();
            if ($claimedBy && $claimedBy->getId() !== $this->getUser()->getId()) {
                return $this->json([
                    'error'     => 'Cette suggestion est déjà prise en charge par un autre admin.',
                    'claimedBy' => $claimedBy->getUsername(),
                ], 409);
            }
        }

        $suggestion->setStatus(SuggestionStatus::IN_PROGRESS);
        $suggestion->setClaimedBy($this->getUser());
        $suggestion->setClaimedAt(new \DateTime());

        $this->suggestionRepo->save($suggestion);

        return $this->json([
            'id'        => $suggestion->getId(),
            'status'    => $suggestion->getStatus()->value,
            'claimedBy' => $suggestion->getClaimedBy()->getUsername(),
        ], 200);
    }

    #[Route('/{id}/approve', name: 'admin_group_suggestion_approve', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Approuver une suggestion et créer le groupe',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Suggestion approuvée, groupe créé'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Suggestion non trouvée'),
            new OA\Response(response: 409, description: 'Suggestion non claimée par cet admin'),
        ]
    )]
    public function approve(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $suggestion = $this->suggestionRepo->find($id);
        if (!$suggestion) {
            return $this->json(['error' => 'Suggestion non trouvée.'], 404);
        }

        $currentAdmin = $this->getUser();

        if (
            $suggestion->getStatus() !== SuggestionStatus::IN_PROGRESS ||
            $suggestion->getClaimedBy()?->getId() !== $currentAdmin->getId()
        ) {
            return $this->json([
                'error' => 'Vous devez avoir pris en charge cette suggestion pour l\'approuver.',
            ], 409);
        }

        $group = new TechGroup();
        $group->setName($suggestion->getName());
        $group->setDescription($suggestion->getDescription());
        $group->setCreator($currentAdmin);
        $this->techGroupRepo->save($group);

        if ($suggestion->getRssFeedUrl() !== null) {
            $source = new TechWatchSource();
            $source->setTechGroup($group);
            $source->setFeedUrl($suggestion->getRssFeedUrl());
            $source->setName($suggestion->getName());
            $this->techWatchSourceRepo->save($source);
        }

        $suggestion->setStatus(SuggestionStatus::APPROVED);
        $suggestion->setApprovedBy($currentAdmin);
        $suggestion->setApprovedAt(new \DateTime());
        $this->suggestionRepo->save($suggestion);

        return $this->json([
            'id'        => $suggestion->getId(),
            'status'    => $suggestion->getStatus()->value,
            'groupId'   => $group->getId(),
            'groupName' => $group->getName(),
        ], 200);
    }

    #[Route('/{id}/reject', name: 'admin_group_suggestion_reject', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Rejeter une suggestion',
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'))
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['resolutionNote'],
                properties: [
                    new OA\Property(property: 'resolutionNote', type: 'string', example: 'Groupe déjà existant sous le nom "DevOps FR".'),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Suggestion rejetée'),
            new OA\Response(response: 403, description: 'Accès interdit'),
            new OA\Response(response: 404, description: 'Suggestion non trouvée'),
            new OA\Response(response: 409, description: 'Suggestion non claimée par cet admin'),
            new OA\Response(response: 422, description: 'Note de résolution manquante'),
        ]
    )]
    public function reject(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $suggestion = $this->suggestionRepo->find($id);
        if (!$suggestion) {
            return $this->json(['error' => 'Suggestion non trouvée.'], 404);
        }

        $currentAdmin = $this->getUser();

        if (
            $suggestion->getStatus() !== SuggestionStatus::IN_PROGRESS ||
            $suggestion->getClaimedBy()?->getId() !== $currentAdmin->getId()
        ) {
            return $this->json([
                'error' => 'Vous devez avoir pris en charge cette suggestion pour la rejeter.',
            ], 409);
        }

        $data           = json_decode($request->getContent(), true);
        $resolutionNote = trim($data['resolutionNote'] ?? '');

        if ($resolutionNote === '') {
            return $this->json(['error' => 'Une note de résolution est obligatoire pour rejeter une suggestion.'], 422);
        }

        $suggestion->setStatus(SuggestionStatus::REJECTED);
        $suggestion->setRejectedBy($currentAdmin);
        $suggestion->setRejectedAt(new \DateTime());
        $suggestion->setResolutionNote($resolutionNote);
        $this->suggestionRepo->save($suggestion);

        return $this->json([
            'id'             => $suggestion->getId(),
            'status'         => $suggestion->getStatus()->value,
            'resolutionNote' => $suggestion->getResolutionNote(),
        ], 200);
    }
}
