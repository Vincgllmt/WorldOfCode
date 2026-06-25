<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\MentorProfileRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use OpenApi\Attributes as OA;

#[Route('/api/admin/mentors')]
#[OA\Tag(name: 'Admin')]
class AdminMentorController extends AbstractController
{
    public function __construct(
        private MentorProfileRepository $mentorProfileRepo,
    ) {}

    #[Route('', name: 'admin_mentors_list', methods: ['GET'])]
    #[OA\Get(
        summary: 'Liste des profils mentor (admin)',
        parameters: [
            new OA\Parameter(name: 'q',           in: 'query', schema: new OA\Schema(type: 'string')),
            new OA\Parameter(name: 'isAvailable', in: 'query', schema: new OA\Schema(type: 'boolean')),
        ],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function list(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $q           = (string) $request->query->get('q', '');
        $isAvailable = $request->query->has('isAvailable')
            ? filter_var($request->query->get('isAvailable'), FILTER_VALIDATE_BOOLEAN)
            : null;

        $qb = $this->mentorProfileRepo->createQueryBuilder('p')
            ->innerJoin('p.user', 'u')->addSelect('u')
            ->leftJoin('p.specialties', 's')->addSelect('s');

        if ($q !== '') {
            $qb->andWhere('u.username LIKE :q')->setParameter('q', '%' . $q . '%');
        }

        if ($isAvailable !== null) {
            $qb->andWhere('p.isAvailable = :available')->setParameter('available', $isAvailable);
        }

        $profiles = $qb->orderBy('p.totalSessions', 'DESC')->getQuery()->getResult();

        return $this->json(array_map(fn($p) => [
            'id'              => $p->getId(),
            'userId'          => $p->getUser()->getId(),
            'username'        => $p->getUser()->getUsername(),
            'isAvailable'     => $p->isAvailable(),
            'specialties'     => array_map(fn($s) => $s->getName(), $p->getSpecialties()->toArray()),
            'averageRating'   => $p->getAverageRating(),
            'totalSessions'   => $p->getTotalSessions(),
            'reliabilityRate' => $p->getReliabilityRate(),
            'maxActiveMentees'=> $p->getMaxActiveMentees(),
            'teachingStyle'   => $p->getTeachingStyle()?->value,
            'createdAt'       => $p->getCreatedAt()->format('c'),
        ], $profiles));
    }

    #[Route('/{id}', name: 'admin_mentor_detail', methods: ['GET'])]
    #[OA\Get(
        summary: 'Détail d\'un profil mentor avec stats live (admin)',
        responses: [
            new OA\Response(response: 200, description: 'OK'),
            new OA\Response(response: 404, description: 'Non trouvé'),
        ]
    )]
    public function detail(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $profile = $this->mentorProfileRepo->find($id);
        if (!$profile) {
            return $this->json(['error' => 'Profil mentor non trouvé.'], 404);
        }

        $stats = $this->mentorProfileRepo->getStats($profile);

        return $this->json([
            'id'              => $profile->getId(),
            'userId'          => $profile->getUser()->getId(),
            'username'        => $profile->getUser()->getUsername(),
            'email'           => $profile->getUser()->getEmail(),
            'isAvailable'     => $profile->isAvailable(),
            'specialties'     => array_map(fn($s) => $s->getName(), $profile->getSpecialties()->toArray()),
            'averageRating'   => $profile->getAverageRating(),
            'totalSessions'   => $stats['totalSessions'],
            'activeSessions'  => $stats['activeSessions'],
            'totalMentees'    => $stats['totalMentees'],
            'reliabilityRate' => $profile->getReliabilityRate(),
            'maxActiveMentees'=> $profile->getMaxActiveMentees(),
            'teachingStyle'   => $profile->getTeachingStyle()?->value,
            'mentorBio'       => $profile->getMentorBio(),
            'createdAt'       => $profile->getCreatedAt()->format('c'),
        ]);
    }
}
