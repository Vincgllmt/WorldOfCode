<?php

namespace App\Controller;

use App\Entity\MentoringSession;
use App\Entity\Notification;
use App\Entity\User;
use App\Enum\MentoringRequestStatus;
use App\Enum\NotificationType;
use App\Enum\SessionFormat;
use App\Repository\MentoringRequestRepository;
use App\Repository\MentorProfileRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentoringSession')]
class MentoringAcceptController extends AbstractController
{
    public function __construct(
        private MentoringRequestRepository $requestRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private EntityManagerInterface $em,
    ) {}

    #[Route('/api/mentor/requests/{id}/accept', name: 'mentor_request_accept', methods: ['POST'])]
    #[OA\Post(
        summary: 'Accepter une demande et créer la session',
        requestBody: new OA\RequestBody(
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'format', type: 'string', enum: ['text', 'video', 'hybrid']),
                    new OA\Property(property: 'conversationId', type: 'string', nullable: true),
                ],
                type: 'object'
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Session créée'),
            new OA\Response(response: 404, description: 'Demande non trouvée'),
            new OA\Response(response: 409, description: 'Demande déjà acceptée'),
        ]
    )]
    public function accept(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $mentoringRequest = $this->requestRepo->find($id);
        if (!$mentoringRequest) {
            return $this->json(['error' => 'Demande non trouvée.'], 404);
        }

        if ($mentoringRequest->getStatus() === MentoringRequestStatus::ACCEPTED) {
            return $this->json([
                'error' => 'Cette demande a déjà été acceptée.',
                'code'  => 'REQUEST_ALREADY_ACCEPTED',
            ], 409);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        $format = SessionFormat::tryFrom($data['format'] ?? '') ?? SessionFormat::TEXT;

        $session = new MentoringSession();
        $session->setMentor($profile);
        $session->setJunior($mentoringRequest->getJunior());
        $session->setRequest($mentoringRequest);
        $session->setFormat($format);
        if (!empty($data['conversationId'])) {
            $session->setConversationId($data['conversationId']);
        }

        $mentoringRequest->setStatus(MentoringRequestStatus::ACCEPTED);

        $this->em->persist($session);

        // Notification MENTORING_REQUEST_ACCEPTED pour le junior
        $notif = new Notification();
        $notif->setRecipient($mentoringRequest->getJunior())
            ->setSender($user)
            ->setType(NotificationType::MENTORING_REQUEST_ACCEPTED)
            ->setRelatedEntityId($mentoringRequest->getId())
            ->setMessage($user->getUsername() . ' a accepté votre demande de mentorat.');
        $this->em->persist($notif);

        $this->em->flush(); // PrePersist règle createdAt

        return $this->json($this->serializeSession($session), 201);
    }

    private function serializeSession(MentoringSession $s): array
    {
        return [
            'id'             => $s->getId(),
            'status'         => $s->getStatus()->value,
            'format'         => $s->getFormat()->value,
            'conversationId' => $s->getConversationId(),
            'scheduledAt'    => $s->getScheduledAt()?->format('c'),
            'mentor'         => [
                'id'       => $s->getMentor()->getId(),
                'username' => $s->getMentor()->getUser()->getUsername(),
            ],
            'junior'         => [
                'id'       => $s->getJunior()->getId(),
                'username' => $s->getJunior()->getUsername(),
            ],
            'createdAt'      => $s->getCreatedAt()->format('c'),
        ];
    }
}
