<?php

namespace App\Controller;

use App\Entity\MentorProfile;
use App\Entity\MentoringRequest;
use App\Entity\User;
use App\Repository\MentoringPinRepository;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringSessionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/mentor/requests')]
#[OA\Tag(name: 'MentorCockpit')]
class MentorCockpitController extends AbstractController
{
    public function __construct(
        private MentorProfileRepository $mentorProfileRepo,
        private MentoringRequestRepository $requestRepo,
        private MentoringPinRepository $pinRepo,
        private MentoringSessionRepository $sessionRepo,
    ) {}

    #[Route('', name: 'mentor_feed', methods: ['GET'])]
    #[OA\Get(
        summary: 'Feed paginé des demandes pour le mentor',
        parameters: [
            new OA\Parameter(name: 'page', in: 'query', schema: new OA\Schema(type: 'integer', default: 1)),
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer', default: 20)),
            new OA\Parameter(name: 'techStack', in: 'query', schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Feed retourné'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Pas de profil mentor'),
        ]
    )]
    public function getFeed(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $page      = max(1, (int) $request->query->get('page', 1));
        $limit     = min(50, max(1, (int) $request->query->get('limit', 20)));
        $techStack = $request->query->get('techStack') ?: null;

        $result = $this->requestRepo->findPublicFeed(
            $techStack ? ['techStack' => $techStack] : [],
            $page,
            $limit,
            $profile
        );

        return $this->json([
            'data' => array_map(
                fn($r) => $this->serializeRequest($r, $profile),
                $result['data']
            ),
            'meta' => [
                'page'  => $page,
                'limit' => $limit,
                'total' => $result['total'],
            ],
        ]);
    }

    #[Route('/{id}', name: 'mentor_request_detail', methods: ['GET'])]
    #[OA\Get(
        summary: "Détail d'une demande avec contexte junior complet",
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Détail retourné'),
            new OA\Response(response: 401, description: 'Non authentifié'),
            new OA\Response(response: 403, description: 'Pas de profil mentor'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
        ]
    )]
    public function getRequestDetail(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }

        // Demande privée : seul le mentor ciblé peut y accéder
        if (!$mentoringRequest->isPublic()) {
            $target = $mentoringRequest->getTargetMentor();
            if (!$target || $target->getId() !== $profile->getId()) {
                return $this->json(['error' => 'Accès refusé.'], 403);
            }
        }

        return $this->json($this->serializeRequestFull($mentoringRequest, $profile));
    }

    private function serializeRequest(MentoringRequest $r, MentorProfile $mentor): array
    {
        $description = $r->getDescription();
        $excerpt = mb_strlen($description) > 150
            ? mb_substr($description, 0, 150) . '...'
            : $description;

        $activePinForMentor = $this->pinRepo->findOneBy([
            'mentor'   => $mentor,
            'request'  => $r,
            'isActive' => true,
        ]);

        return [
            'id'                 => $r->getId(),
            'type'               => $r->getType()->value,
            'status'             => $r->getStatus()->value,
            'title'              => $r->getTitle(),
            'techStack'          => $r->getTechStack(),
            'descriptionExcerpt' => $excerpt,
            'compatibilityScore' => $r->getCompatibilityScore(),
            'isPublic'           => $r->isPublic(),
            'isTargeted'         => !$r->isPublic(),
            'junior'             => [
                'id'       => $r->getJunior()->getId(),
                'username' => $r->getJunior()->getUsername(),
            ],
            'pin' => $activePinForMentor ? [
                'expiresAt' => $activePinForMentor->getExpiresAt()->format('c'),
                'isActive'  => true,
            ] : null,
            'createdAt' => $r->getCreatedAt()->format('c'),
        ];
    }

    private function serializeRequestFull(MentoringRequest $r, MentorProfile $mentor): array
    {
        $base = $this->serializeRequest($r, $mentor);

        $junior = $r->getJunior();

        $previousSessions = $this->sessionRepo->findBy(
            ['mentor' => $mentor, 'junior' => $junior],
            ['createdAt' => 'DESC'],
            5
        );

        return array_merge($base, [
            'description'      => $r->getDescription(),
            'blockedSince'     => $r->getBlockedSince(),
            'alreadyTried'     => $r->getAlreadyTried(),
            'expectedBehavior' => $r->getExpectedBehavior(),
            'observedBehavior' => $r->getObservedBehavior(),
            'juniorContext'    => [
                'id'       => $junior->getId(),
                'username' => $junior->getUsername(),
                'skills'   => [],
                'previousSessions' => array_map(fn($s) => [
                    'id'          => $s->getId(),
                    'status'      => $s->getStatus()->value,
                    'format'      => $s->getFormat()->value,
                    'completedAt' => $s->getCompletedAt()?->format('c'),
                ], $previousSessions),
            ],
        ]);
    }
}
