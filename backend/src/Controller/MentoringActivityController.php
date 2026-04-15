<?php

namespace App\Controller;

use App\Entity\User;
use App\Enum\MentoringSessionStatus;
use App\Repository\FollowRepository;
use App\Repository\MentorProfileRepository;
use App\Repository\MentoringSessionRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[OA\Tag(name: 'MentoringFeed')]
class MentoringActivityController extends AbstractController
{
    public function __construct(
        private FollowRepository $followRepo,
        private MentorProfileRepository $mentorProfileRepo,
        private MentoringSessionRepository $sessionRepo,
    ) {}

    #[Route('/api/mentoring/feed/following', name: 'mentoring_following_feed', methods: ['GET'])]
    #[OA\Get(
        summary: 'Fil d\'activité des mentors suivis',
        parameters: [
            new OA\Parameter(name: 'page',  in: 'query', schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'limit', in: 'query', schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Feed retourné'),
        ]
    )]
    public function getFollowingFeed(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('IS_AUTHENTICATED_FULLY');
        /** @var User $user */
        $user = $this->getUser();

        $page  = max(1, (int) $request->query->get('page', 1));
        $limit = min(50, max(1, (int) $request->query->get('limit', 20)));

        // Utilisateurs suivis (follower = moi, followed = les mentors)
        $follows       = $this->followRepo->findBy(['follower' => $user]);
        $followedUsers = array_map(fn($f) => $f->getFollowed(), $follows);

        if (empty($followedUsers)) {
            return $this->json([
                'data' => [],
                'meta' => ['page' => 1, 'limit' => $limit, 'total' => 0],
            ]);
        }

        $events = [];
        $since  = (new \DateTime())->modify('-30 days');

        foreach ($followedUsers as $followedUser) {
            $profile = $this->mentorProfileRepo->findOneBy(['user' => $followedUser]);
            if (!$profile) {
                continue;
            }

            // Sessions récentes créées par ce mentor
            $recentSessions = $this->sessionRepo->createQueryBuilder('s')
                ->where('s.mentor = :profile')
                ->andWhere('s.status = :status')
                ->andWhere('s.createdAt >= :from')
                ->setParameter('profile', $profile)
                ->setParameter('status', MentoringSessionStatus::SCHEDULED)
                ->setParameter('from', $since)
                ->getQuery()
                ->getResult();

            foreach ($recentSessions as $session) {
                $events[] = [
                    'type'      => 'new_session',
                    'mentor'    => ['id' => $followedUser->getId(), 'username' => $followedUser->getUsername()],
                    'message'   => $followedUser->getUsername() . ' a démarré une nouvelle session de mentorat',
                    'createdAt' => $session->getCreatedAt()->format('c'),
                    'timestamp' => $session->getCreatedAt()->getTimestamp(),
                ];
            }

            // Disponibilité activée
            if ($profile->isAvailable() && $profile->getUpdatedAt() >= $since) {
                $events[] = [
                    'type'      => 'availability_on',
                    'mentor'    => ['id' => $followedUser->getId(), 'username' => $followedUser->getUsername()],
                    'message'   => $followedUser->getUsername() . ' est maintenant disponible pour le mentorat',
                    'createdAt' => $profile->getUpdatedAt()->format('c'),
                    'timestamp' => $profile->getUpdatedAt()->getTimestamp(),
                ];
            }
        }

        // Tri décroissant par date
        usort($events, fn($a, $b) => $b['timestamp'] - $a['timestamp']);

        $total      = count($events);
        $pagedSlice = array_slice($events, ($page - 1) * $limit, $limit);

        // Retirer le champ interne timestamp
        $data = array_values(array_map(
            fn($e) => array_filter($e, fn($k) => $k !== 'timestamp', ARRAY_FILTER_USE_KEY),
            $pagedSlice
        ));

        return $this->json([
            'data' => $data,
            'meta' => ['page' => $page, 'limit' => $limit, 'total' => $total],
        ]);
    }
}
