<?php

namespace App\Controller;

use App\Entity\MentoringRequest;
use App\Entity\Notification;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\NotificationType;
use App\Enum\MentoringRequestType;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/mentoring/requests')]
#[OA\Tag(name: 'MentoringRequests')]
class MentoringRequestController extends AbstractController
{
    public function __construct(
        private MentoringRequestRepository $requestRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private MentoringSessionRepository $sessionRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('', name: 'mentoring_request_create', methods: ['POST'])]
    #[OA\Post(
        summary: 'Créer une demande de mentorat',
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['type', 'title', 'techStack', 'description'],
                properties: [
                    new OA\Property(property: 'type', type: 'string', enum: ['debug', 'one_to_one', 'exercise', 'code_review']),
                    new OA\Property(property: 'title', type: 'string', maxLength: 255),
                    new OA\Property(property: 'techStack', type: 'string'),
                    new OA\Property(property: 'description', type: 'string'),
                    new OA\Property(property: 'blockedSince', type: 'string', nullable: true),
                    new OA\Property(property: 'alreadyTried', type: 'string', nullable: true),
                    new OA\Property(property: 'expectedBehavior', type: 'string', nullable: true),
                    new OA\Property(property: 'observedBehavior', type: 'string', nullable: true),
                    new OA\Property(property: 'isPublic', type: 'boolean'),
                    new OA\Property(property: 'targetMentorId', type: 'integer', nullable: true),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Demande créée'),
            new OA\Response(response: 422, description: 'Validation échouée'),
        ]
    )]
    public function create(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $data = json_decode($request->getContent(), true) ?? [];

        // Validation
        if (empty($data['title']) || mb_strlen($data['title']) > 255) {
            return $this->json(['error' => 'Le titre est requis (max 255 caractères).'], 422);
        }
        if (empty($data['techStack'])) {
            return $this->json(['error' => 'Le techStack est requis.'], 422);
        }
        if (empty($data['description'])) {
            return $this->json(['error' => 'La description est requise.'], 422);
        }
        $type = MentoringRequestType::tryFrom($data['type'] ?? '');
        if (!$type) {
            return $this->json(['error' => 'Type de demande invalide.'], 422);
        }

        $mentoringRequest = new MentoringRequest();
        $mentoringRequest->setJunior($user);
        $mentoringRequest->setType($type);
        $mentoringRequest->setTitle($data['title']);
        $mentoringRequest->setTechStack($data['techStack']);
        $mentoringRequest->setDescription($data['description']);
        $mentoringRequest->setBlockedSince($data['blockedSince'] ?? null);
        $mentoringRequest->setAlreadyTried($data['alreadyTried'] ?? null);
        $mentoringRequest->setExpectedBehavior($data['expectedBehavior'] ?? null);
        $mentoringRequest->setObservedBehavior($data['observedBehavior'] ?? null);
        $mentoringRequest->setCodeSnippet($data['codeSnippet'] ?? null);
        $mentoringRequest->setCodeLanguage($data['codeLanguage'] ?? null);
        $mentoringRequest->setIsPublic((bool) ($data['isPublic'] ?? true));

        if (!empty($data['targetMentorId'])) {
            $targetProfile = $this->mentorProfileRepo->find((int) $data['targetMentorId']);
            if (!$targetProfile) {
                return $this->json(['error' => 'Mentor cible introuvable.', 'code' => 'TARGET_MENTOR_NOT_FOUND'], 422);
            }
            $mentoringRequest->setTargetMentor($targetProfile);
            $mentoringRequest->setIsPublic(false);
        }

        $this->em->persist($mentoringRequest);
        $this->em->flush(); // PrePersist génère compatibilityScore = random_int(60, 99)

        // Notifications MENTORING_NEW_REQUEST pour les mentors disponibles avec la spécialité
        if ($mentoringRequest->isPublic()) {
            $availableMentors = $this->mentorProfileRepo->findBy(['isAvailable' => true]);
            foreach ($availableMentors as $mentorProfile) {
                if ($mentorProfile->getUser() === $user) {
                    continue; // Ne pas notifier soi-même
                }
                $specialtyNames = array_map(
                    fn($s) => strtolower($s->getName()),
                    $mentorProfile->getSpecialties()->toArray()
                );
                if (!in_array(strtolower($mentoringRequest->getTechStack()), $specialtyNames, true)) {
                    continue;
                }
                $notif = new Notification();
                $notif->setRecipient($mentorProfile->getUser())
                    ->setSender($user)
                    ->setType(NotificationType::MENTORING_NEW_REQUEST)
                    ->setRelatedEntityId($mentoringRequest->getId())
                    ->setMessage($user->getUsername() . ' cherche de l\'aide en ' . $mentoringRequest->getTechStack());
                $this->em->persist($notif);
            }
            $this->em->flush();
        }

        return $this->json($this->serialize($mentoringRequest), 201);
    }

    #[Route('/mine', name: 'mentoring_requests_mine', methods: ['GET'])]
    #[OA\Get(summary: 'Liste mes demandes', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function myRequests(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $requests = $this->requestRepo->findBy(['junior' => $user], ['createdAt' => 'DESC']);
        return $this->json(array_map([$this, 'serialize'], $requests));
    }

    #[Route('/{id}', name: 'mentoring_request_update', methods: ['PUT'])]
    #[OA\Put(
        summary: 'Mettre à jour une demande',
        responses: [
            new OA\Response(response: 200, description: 'Demande mise à jour'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
            new OA\Response(response: 422, description: 'Demande non modifiable'),
        ]
    )]
    public function update(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }
        if ($mentoringRequest->getJunior() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        if ($mentoringRequest->getStatus() !== MentoringRequestStatus::PENDING) {
            return $this->json([
                'error' => 'Seules les demandes en attente peuvent être modifiées.',
                'code'  => 'REQUEST_NOT_MODIFIABLE',
            ], 422);
        }

        $data = json_decode($request->getContent(), true) ?? [];

        if (isset($data['title'])) {
            if (empty($data['title']) || mb_strlen($data['title']) > 255) {
                return $this->json(['error' => 'Le titre est requis (max 255 caractères).'], 422);
            }
            $mentoringRequest->setTitle($data['title']);
        }
        if (isset($data['techStack'])) $mentoringRequest->setTechStack($data['techStack']);
        if (isset($data['description'])) $mentoringRequest->setDescription($data['description']);
        if (array_key_exists('blockedSince', $data)) $mentoringRequest->setBlockedSince($data['blockedSince']);
        if (array_key_exists('alreadyTried', $data)) $mentoringRequest->setAlreadyTried($data['alreadyTried']);
        if (array_key_exists('expectedBehavior', $data)) $mentoringRequest->setExpectedBehavior($data['expectedBehavior']);
        if (array_key_exists('observedBehavior', $data)) $mentoringRequest->setObservedBehavior($data['observedBehavior']);
        if (array_key_exists('codeSnippet', $data)) $mentoringRequest->setCodeSnippet($data['codeSnippet']);
        if (array_key_exists('codeLanguage', $data)) $mentoringRequest->setCodeLanguage($data['codeLanguage']);

        $this->em->flush();
        return $this->json($this->serialize($mentoringRequest));
    }

    #[Route('/{id}/make-public', name: 'mentoring_request_make_public', methods: ['PATCH'])]
    #[OA\Patch(
        summary: 'Rendre une demande publique',
        responses: [
            new OA\Response(response: 200, description: 'Demande rendue publique'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
            new OA\Response(response: 422, description: 'Demande déjà publique'),
        ]
    )]
    public function makePublic(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }
        if ($mentoringRequest->getJunior() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        if ($mentoringRequest->isPublic()) {
            return $this->json(['error' => 'La demande est déjà publique.'], 422);
        }

        $mentoringRequest->setIsPublic(true);
        $this->em->flush();
        return $this->json($this->serialize($mentoringRequest));
    }

    #[Route('/{id}', name: 'mentoring_request_cancel', methods: ['DELETE'])]
    #[OA\Delete(
        summary: 'Annuler une demande (soft delete)',
        responses: [
            new OA\Response(response: 200, description: 'Demande annulée'),
            new OA\Response(response: 403, description: 'Accès non autorisé'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
        ]
    )]
    public function cancel(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }
        if ($mentoringRequest->getJunior() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $cancellableStatuses = [MentoringRequestStatus::PENDING, MentoringRequestStatus::PINNED];
        if (!in_array($mentoringRequest->getStatus(), $cancellableStatuses, true)) {
            return $this->json([
                'error' => 'Seules les demandes en attente ou épinglées peuvent être annulées.',
                'code'  => 'REQUEST_NOT_CANCELLABLE',
            ], 422);
        }

        $mentoringRequest->setStatus(MentoringRequestStatus::CANCELLED);
        $this->em->flush();
        return $this->json(['message' => 'Demande annulée.']);
    }

    private function serialize(MentoringRequest $r): array
    {
        $data = [
            'id'                 => $r->getId(),
            'type'               => $r->getType()->value,
            'status'             => $r->getStatus()->value,
            'title'              => $r->getTitle(),
            'techStack'          => $r->getTechStack(),
            'description'        => $r->getDescription(),
            'blockedSince'       => $r->getBlockedSince(),
            'alreadyTried'       => $r->getAlreadyTried(),
            'expectedBehavior'   => $r->getExpectedBehavior(),
            'observedBehavior'   => $r->getObservedBehavior(),
            'codeSnippet'        => $r->getCodeSnippet(),
            'codeLanguage'       => $r->getCodeLanguage(),
            'isPublic'           => $r->isPublic(),
            'compatibilityScore' => $r->getCompatibilityScore(),
            'targetMentorId'     => $r->getTargetMentor()?->getId(),
            'createdAt'          => $r->getCreatedAt()->format('c'),
            'session'            => null,
        ];

        if ($r->getStatus() === MentoringRequestStatus::ACCEPTED) {
            $session = $this->sessionRepo->findOneBy(['request' => $r]);
            if ($session) {
                $data['session'] = [
                    'id'             => $session->getId(),
                    'format'         => $session->getFormat()->value,
                    'conversationId' => $session->getConversationId(),
                    'mentor'         => [
                        'id'       => $session->getMentor()->getUser()->getId(),
                        'username' => $session->getMentor()->getUser()->getUsername(),
                    ],
                    'status'      => $session->getStatus()->value,
                    'scheduledAt' => $session->getScheduledAt()?->format('c'),
                ];
            }
        }

        return $data;
    }
}
