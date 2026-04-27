<?php

namespace App\Controller;

use App\Entity\MentoringSession;
use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use App\Service\Mentoring\MentoringSessionService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentoringSession')]
class MentoringSessionController extends AbstractController
{
    public function __construct(
        private MentoringSessionRepository $sessionRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private MentoringSessionService $sessionService,
        private EntityManagerInterface $em,
    ) {}

    // ──────────────────────────────────────────────
    // Tâche 4 — Sessions actives du mentor
    // ──────────────────────────────────────────────

    #[Route('/api/mentor/sessions', name: 'mentor_sessions_active', methods: ['GET'])]
    #[OA\Get(summary: 'Sessions actives du mentor', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function mentorActiveSessions(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);

        $sessions = $this->sessionRepo->createQueryBuilder('s')
            ->where('s.mentor = :profile')
            ->andWhere('s.status NOT IN (:done)')
            ->setParameter('profile', $profile)
            ->setParameter('done', [MentoringSessionStatus::COMPLETED, MentoringSessionStatus::CANCELLED])
            ->orderBy('s.createdAt', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->json(array_map([$this, 'serializeSession'], $sessions));
    }

    // ──────────────────────────────────────────────
    // Tâche 5 — Sessions du junior (route /mine AVANT /{id})
    // ──────────────────────────────────────────────

    #[Route('/api/mentoring/sessions/mine', name: 'junior_sessions_mine', methods: ['GET'])]
    #[OA\Get(summary: 'Mes sessions (junior)', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function mySessions(): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $sessions = $this->sessionRepo->findBy(['junior' => $user], ['createdAt' => 'DESC']);
        return $this->json(array_map([$this, 'serializeSession'], $sessions));
    }

    #[Route('/api/mentoring/sessions/{id}', name: 'session_detail', methods: ['GET'])]
    #[OA\Get(summary: 'Détail d\'une session', responses: [
        new OA\Response(response: 200, description: 'OK'),
        new OA\Response(response: 403, description: 'Accès refusé'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
    ])]
    public function getSession(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getJunior() !== $user && $session->getMentor()->getUser() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        return $this->json($this->serializeSession($session));
    }

    // ──────────────────────────────────────────────
    // Tâche 2 — Routes PATCH cycle de vie
    // ──────────────────────────────────────────────

    #[Route('/api/mentoring/sessions/{id}/start', name: 'session_start', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Démarrer une session', responses: [
        new OA\Response(response: 200, description: 'Session démarrée'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
    ])]
    public function startSession(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getMentor()->getUser() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        if ($session->getStatus() !== MentoringSessionStatus::SCHEDULED) {
            return $this->json(['error' => 'Seules les sessions planifiées peuvent être démarrées.', 'code' => 'SESSION_NOT_STARTABLE'], 422);
        }

        $session->setStatus(MentoringSessionStatus::IN_PROGRESS);
        $session->setStartedAt(new \DateTime());
        $this->em->flush();
        return $this->json($this->serializeSession($session));
    }

    #[Route('/api/mentoring/sessions/{id}/complete', name: 'session_complete', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Clôturer une session', responses: [
        new OA\Response(response: 200, description: 'Session complétée'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
        new OA\Response(response: 422, description: 'Session non clôturable'),
    ])]
    public function completeSession(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getMentor() !== $profile) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        if ($session->getStatus() !== MentoringSessionStatus::IN_PROGRESS) {
            return $this->json(['error' => 'Seules les sessions en cours peuvent être clôturées.', 'code' => 'SESSION_NOT_COMPLETABLE'], 422);
        }

        $this->sessionService->complete($session);
        return $this->json($this->serializeSession($session));
    }

    #[Route('/api/mentoring/sessions/{id}/schedule', name: 'session_schedule', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Confirmer une proposition de date (junior)', responses: [
        new OA\Response(response: 200, description: 'Date confirmée'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
        new OA\Response(response: 422, description: 'Date invalide'),
    ])]
    public function scheduleSession(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getJunior() !== $user) {
            return $this->json(['error' => 'Seul le junior peut confirmer une date.'], 403);
        }

        $data = json_decode($request->getContent(), true) ?? [];
        if (empty($data['scheduledAt'])) {
            return $this->json(['error' => 'La date est requise.'], 422);
        }
        try {
            $scheduledAt = new \DateTime($data['scheduledAt']);
        } catch (\Exception) {
            return $this->json(['error' => 'Format de date invalide.'], 422);
        }

        $session->setScheduledAt($scheduledAt);
        $this->em->flush();

        return $this->json($this->serializeSession($session));
    }

    #[Route('/api/mentoring/sessions/{id}/cancel', name: 'session_cancel', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Annuler une session', responses: [
        new OA\Response(response: 200, description: 'Session annulée'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Session non trouvée'),
        new OA\Response(response: 422, description: 'Session non annulable'),
    ])]
    public function cancelSession(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $session = $this->sessionRepo->find($id);
        if (!$session) {
            return $this->json(['error' => 'Session non trouvée.'], 404);
        }
        if ($session->getMentor()->getUser() !== $user && $session->getJunior() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }
        $cancellable = [MentoringSessionStatus::SCHEDULED, MentoringSessionStatus::IN_PROGRESS];
        if (!in_array($session->getStatus(), $cancellable, true)) {
            return $this->json(['error' => 'Cette session ne peut pas être annulée.', 'code' => 'SESSION_NOT_CANCELLABLE'], 422);
        }

        $session->setStatus(MentoringSessionStatus::CANCELLED);
        $this->em->flush();
        return $this->json($this->serializeSession($session));
    }

    private function serializeSession(MentoringSession $s): array
    {
        return [
            'id'             => $s->getId(),
            'status'         => $s->getStatus()->value,
            'format'         => $s->getFormat()->value,
            'conversationId' => $s->getConversationId(),
            'scheduledAt'    => $s->getScheduledAt()?->format('c'),
            'startedAt'      => $s->getStartedAt()?->format('c'),
            'completedAt'    => $s->getCompletedAt()?->format('c'),
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
