<?php

namespace App\Controller;

use App\Dto\AdminActivityPointDto;
use App\Dto\AdminRecentEventDto;
use App\Dto\AdminStatsResponse;
use App\Repository\PostRepository;
use App\Repository\ReportRepository;
use App\Repository\TechGroupRepository;
use App\Repository\UserRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin')]
#[OA\Tag(name: 'Admin')]
final class AdminStatsController extends AbstractController
{
    public function __construct(
        private UserRepository $userRepo,
        private PostRepository $postRepo,
        private TechGroupRepository $groupRepo,
        private ReportRepository $reportRepo,
    ) {}

    #[Route('/stats', name: 'admin_stats', methods: ['GET'])]
    #[OA\Get(
        summary: 'Statistiques globales pour le dashboard admin',
        responses: [
            new OA\Response(response: 200, description: 'Statistiques admin'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function stats(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $oneWeekAgo = new \DateTime('-7 days');

        // TODO Epic 4.1: filter pendingReportsCount by status = PENDING
        return $this->json(new AdminStatsResponse(
            totalUsers: $this->userRepo->count([]),
            totalPosts: $this->postRepo->count([]),
            totalGroups: $this->groupRepo->count([]),
            pendingReportsCount: $this->reportRepo->count([]),
            newUsersThisWeek: $this->userRepo->countSince($oneWeekAgo),
            newPostsThisWeek: $this->postRepo->countSince($oneWeekAgo),
            topGroups: $this->groupRepo->findTopByActivity(5),
        ));
    }

    #[Route('/activity', name: 'admin_activity', methods: ['GET'])]
    #[OA\Get(
        summary: 'Activité journalière sur N jours (inscriptions + posts)',
        parameters: [
            new OA\Parameter(name: 'days', in: 'query', schema: new OA\Schema(type: 'integer', default: 30, minimum: 1, maximum: 90))
        ],
        responses: [
            new OA\Response(response: 200, description: 'Activité par jour'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function activity(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $days = max(1, min(90, (int) $request->query->get('days', 30)));
        $since = new \DateTime("-{$days} days");
        $since->setTime(0, 0, 0);

        $usersByDay = $this->userRepo->countByDay($since);
        $postsByDay = $this->postRepo->countByDay($since);

        // Générer tous les jours de la plage pour combler les trous (AC #4)
        $points = [];
        $cursor = clone $since;
        $today = new \DateTime();
        $today->setTime(23, 59, 59);

        while ($cursor <= $today) {
            $key = $cursor->format('Y-m-d');
            $points[] = new AdminActivityPointDto(
                date: $key,
                newUsers: $usersByDay[$key] ?? 0,
                newPosts: $postsByDay[$key] ?? 0,
            );
            $cursor->modify('+1 day');
        }

        return $this->json($points);
    }

    #[Route('/recent-activity', name: 'admin_recent_activity', methods: ['GET'])]
    #[OA\Get(
        summary: 'Les 10 derniers événements du réseau (inscriptions, posts, reports)',
        responses: [
            new OA\Response(response: 200, description: 'Fil d\'activité récente'),
            new OA\Response(response: 403, description: 'Accès interdit'),
        ]
    )]
    public function recentActivity(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $events = [];

        // Derniers utilisateurs inscrits
        $users = $this->userRepo->findBy([], ['creationDate' => 'DESC'], 10);
        foreach ($users as $user) {
            $events[] = new AdminRecentEventDto(
                type: 'new_user',
                actor: $user->getUsername(),
                excerpt: null,
                createdAt: $user->getCreationDate()->format(\DateTimeInterface::ATOM),
            );
        }

        // Derniers posts publiés
        $posts = $this->postRepo->findBy([], ['createdAt' => 'DESC'], 10);
        foreach ($posts as $post) {
            $content = $post->getContent() ?? '';
            $excerpt = mb_strlen($content) > 50
                ? mb_substr($content, 0, 50) . '…'
                : $content;

            $events[] = new AdminRecentEventDto(
                type: 'new_post',
                actor: $post->getAuthor()->getUsername(),
                excerpt: $excerpt ?: null,
                createdAt: $post->getCreatedAt()->format(\DateTimeInterface::ATOM),
            );
        }

        // Derniers reports signalés
        $reports = $this->reportRepo->findBy([], ['createdAt' => 'DESC'], 10);
        foreach ($reports as $report) {
            $events[] = new AdminRecentEventDto(
                type: 'new_report',
                actor: $report->getUser()->getUsername(),
                excerpt: null,
                createdAt: $report->getCreatedAt()->format(\DateTimeInterface::ATOM),
            );
        }

        // Tri par date décroissante + slice 10
        usort($events, fn($a, $b) => strcmp($b->createdAt, $a->createdAt));
        $events = array_slice($events, 0, 10);

        return $this->json($events);
    }
}
