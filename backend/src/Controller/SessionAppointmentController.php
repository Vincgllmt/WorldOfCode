<?php

namespace App\Controller;

use App\Entity\SessionAppointment;
use App\Entity\User;
use App\Enum\SessionFormat;
use App\Repository\MentoringSessionRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\SessionAppointmentRepository;
use App\Service\NotificationService;
use App\Enum\NotificationType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'SessionAppointment')]
class SessionAppointmentController extends AbstractController
{
    public function __construct(
        private MentoringSessionRepository $sessionRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private SessionAppointmentRepository $appointmentRepo,
        private EntityManagerInterface $em,
        private NotificationService $notificationService,
    ) {}

    #[Route('/api/mentoring/sessions/{id}/appointments', name: 'session_appointments_list', methods: ['GET'])]
    #[OA\Get(summary: 'Rendez-vous d\'une session', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function list(int $id): JsonResponse
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

        $appointments = $this->appointmentRepo->findBy(['session' => $session], ['scheduledAt' => 'ASC']);
        return $this->json(array_map([$this, 'serialize'], $appointments));
    }

    #[Route('/api/mentoring/sessions/{id}/appointments', name: 'session_appointments_create', methods: ['POST'])]
    #[OA\Post(summary: 'Planifier un rendez-vous', responses: [
        new OA\Response(response: 201, description: 'Rendez-vous créé'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 422, description: 'Données invalides'),
    ])]
    public function create(int $id, Request $request): JsonResponse
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

        $data = json_decode($request->getContent(), true) ?? [];

        if (empty($data['scheduledAt'])) {
            return $this->json(['error' => 'La date est requise.'], 422);
        }
        try {
            $scheduledAt = new \DateTime($data['scheduledAt']);
        } catch (\Exception) {
            return $this->json(['error' => 'Format de date invalide.'], 422);
        }

        $format = SessionFormat::tryFrom($data['format'] ?? '') ?? $session->getFormat();

        $appointment = new SessionAppointment();
        $appointment->setSession($session);
        $appointment->setScheduledAt($scheduledAt);
        $appointment->setFormat($format);

        $this->em->persist($appointment);
        $this->em->flush();

        $formattedDate = $scheduledAt->format('d/m/Y à H\hi');
        $this->notificationService->createAndPush(
            $session->getJunior(),
            $user,
            NotificationType::MENTORING_SESSION_SCHEDULED,
            $user->getUsername() . ' a planifié un rendez-vous le ' . $formattedDate . '.',
            $session->getId()
        );

        return $this->json($this->serialize($appointment), 201);
    }

    #[Route('/api/mentoring/sessions/{sessionId}/appointments/{id}', name: 'session_appointments_get', methods: ['GET'])]
    #[OA\Get(summary: 'Détail d\'un rendez-vous', responses: [new OA\Response(response: 200, description: 'OK')])]
    public function getOne(int $sessionId, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $appointment = $this->appointmentRepo->find($id);

        if (!$appointment || $appointment->getSession()->getId() !== $sessionId) {
            return $this->json(['error' => 'Rendez-vous non trouvé.'], 404);
        }
        $session = $appointment->getSession();
        if ($session->getJunior() !== $user && $session->getMentor()->getUser() !== $user) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        return $this->json($this->serialize($appointment));
    }

    #[Route('/api/mentoring/sessions/{sessionId}/appointments/{id}/confirm', name: 'session_appointments_confirm', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Confirmer un rendez-vous (junior)', responses: [
        new OA\Response(response: 200, description: 'Confirmé'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Non trouvé'),
        new OA\Response(response: 422, description: 'Déjà confirmé'),
    ])]
    public function confirm(int $sessionId, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $appointment = $this->appointmentRepo->find($id);

        if (!$appointment || $appointment->getSession()->getId() !== $sessionId) {
            return $this->json(['error' => 'Rendez-vous non trouvé.'], 404);
        }
        if ($appointment->getSession()->getJunior() !== $user) {
            return $this->json(['error' => 'Seul le junior peut confirmer.'], 403);
        }
        if ($appointment->getStatus() === 'confirmed') {
            return $this->json(['error' => 'Déjà confirmé.'], 422);
        }

        $appointment->setStatus('confirmed');
        $this->em->flush();

        $mentor = $appointment->getSession()->getMentor()->getUser();
        $formattedDate = $appointment->getScheduledAt()->format('d/m/Y à H\hi');
        $this->notificationService->createAndPush(
            $mentor,
            $user,
            NotificationType::MENTORING_SESSION_SCHEDULED,
            $user->getUsername() . ' a confirmé le rendez-vous du ' . $formattedDate . '.',
            $appointment->getSession()->getId()
        );

        return $this->json($this->serialize($appointment));
    }

    #[Route('/api/mentoring/sessions/{sessionId}/appointments/{id}/refuse', name: 'session_appointments_refuse', methods: ['PATCH'])]
    #[OA\Patch(summary: 'Refuser un rendez-vous (junior)', responses: [
        new OA\Response(response: 200, description: 'Refusé'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Non trouvé'),
        new OA\Response(response: 422, description: 'Déjà traité'),
    ])]
    public function refuse(int $sessionId, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();
        $appointment = $this->appointmentRepo->find($id);

        if (!$appointment || $appointment->getSession()->getId() !== $sessionId) {
            return $this->json(['error' => 'Rendez-vous non trouvé.'], 404);
        }
        if ($appointment->getSession()->getJunior() !== $user) {
            return $this->json(['error' => 'Seul le junior peut refuser.'], 403);
        }
        if ($appointment->getStatus() !== 'pending') {
            return $this->json(['error' => 'Seuls les rendez-vous en attente peuvent être refusés.'], 422);
        }

        $appointment->setStatus('refused');
        $this->em->flush();

        return $this->json($this->serialize($appointment));
    }

    #[Route('/api/mentoring/sessions/{sessionId}/appointments/{id}', name: 'session_appointments_delete', methods: ['DELETE'])]
    #[OA\Delete(summary: 'Supprimer un rendez-vous', responses: [
        new OA\Response(response: 204, description: 'Supprimé'),
        new OA\Response(response: 403, description: 'Accès non autorisé'),
        new OA\Response(response: 404, description: 'Non trouvé'),
    ])]
    public function delete(int $sessionId, int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_MENTOR');
        /** @var User $user */
        $user = $this->getUser();
        $profile = $this->mentorProfileRepo->findOneBy(['user' => $user]);
        $appointment = $this->appointmentRepo->find($id);

        if (!$appointment || $appointment->getSession()->getId() !== $sessionId) {
            return $this->json(['error' => 'Rendez-vous non trouvé.'], 404);
        }
        if ($appointment->getSession()->getMentor() !== $profile) {
            return $this->json(['error' => 'Accès non autorisé.'], 403);
        }

        $this->em->remove($appointment);
        $this->em->flush();

        return $this->json(null, 204);
    }

    private function serialize(SessionAppointment $a): array
    {
        return [
            'id'          => $a->getId(),
            'scheduledAt' => $a->getScheduledAt()->format('c'),
            'format'      => $a->getFormat()->value,
            'status'      => $a->getStatus(),
            'createdAt'   => $a->getCreatedAt()->format('c'),
        ];
    }
}
